const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Environment variables with validation
const mongoUri = process.env.MONGO_URI_TEST;
const PORT = process.env.PORT_BACKEND || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;
const INITIAL_USER_PASSWORD = process.env.INITIAL_USER_PASSWORD;

// Validate critical environment variables
console.log('🔍 Environment Configuration:');
console.log(`   MONGO_URI_TEST: ${mongoUri ? '✅ Set' : '❌ Missing'}`);
console.log(`   JWT_SECRET: ${JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   INITIAL_ADMIN_PASSWORD: ${INITIAL_ADMIN_PASSWORD ? '✅ Set' : '❌ Missing'}`);
console.log(`   INITIAL_USER_PASSWORD: ${INITIAL_USER_PASSWORD ? '✅ Set' : '❌ Missing'}`);

const app = express();

// CORS: Allow frontend and local requests
app.use(cors({
    origin: [
        `http://localhost:${process.env.PORT_FRONTEND || 3000}`,
        `https://localhost:${process.env.PORT_FRONTEND || 3000}`,
        'http://frontend:3000',
        'https://frontend:3000',
        `http://localhost:${process.env.PORT_BACKEND || 3001}`,
        `https://localhost:${process.env.PORT_BACKEND || 3001}`,
        'http://localhost',
        'https://localhost'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware: Parse JSON request bodies
app.use(express.json());

// Models
const User = require('./models/User');
const Team = require('./models/Team');
const Task = require('./models/Task');
const Score = require('./models/Score');
const AuditLog = require('./models/AuditLog');
const UserHistory = require('./models/UserHistory');

// API: Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// Middleware: Verify JWT token for protected routes
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Middleware: Verify Admin role
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

// Helper: Log audit trail
const logAudit = async (action, entityType, entityId, entityName, performedBy, adminUsername, previousValues, newValues, description, ipAddress) => {
    try {
        await AuditLog.create({
            action,
            entityType,
            entityId,
            entityName,
            performedBy,
            adminUsername,
            previousValues,
            newValues,
            description,
            ipAddress
        });
    } catch (err) {
        console.error('Audit logging failed:', err.message);
    }
};

// Helper: Log user history
const logUserHistory = async (userId, username, action, entityType, details, description, role = 'ORGANIZER') => {
    try {
        await UserHistory.create({
            userId,
            username,
            role,
            action,
            entityType,
            details,
            description
        });
    } catch (err) {
        console.error('User history logging failed:', err.message);
    }
};

// API: User login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const user = await User.findOne({ username, deleted: false });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            token,
            user: { id: user._id, username: user.username, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== USERS ENDPOINTS ====================

// Get all users (admin only)
app.get('/api/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ deleted: false }).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single user by ID (admin only)
app.get('/api/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user || user.deleted) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new user (admin only)
app.post('/api/users', verifyAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        if (!['ADMIN', 'ORGANIZER', 'VOLUNTEER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            password: hashedPassword,
            role
        });

        // Log audit
        await logAudit('CREATE', 'USER', newUser._id, username, req.user.id, req.user.username, null,
            { username, role }, `User created: ${username}`, req.ip);

        res.status(201).json(newUser.toObject({ transform: (doc, ret) => { delete ret.password; return ret; } }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user (admin only)
app.put('/api/users/:id', verifyAdmin, async (req, res) => {
    try {
        const { username, role } = req.body;
        const user = await User.findById(req.params.id);
        if (!user || user.deleted) {
            return res.status(404).json({ error: 'User not found' });
        }

        const previousValues = { username: user.username, role: user.role };
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username, _id: { $ne: req.params.id } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            user.username = username;
        }
        if (role && ['ADMIN', 'ORGANIZER', 'VOLUNTEER'].includes(role)) {
            user.role = role;
        }

        const updatedUser = await user.save();

        // Log audit
        await logAudit('UPDATE', 'USER', user._id, user.username, req.user.id, req.user.username,
            previousValues, { username: user.username, role: user.role },
            `User updated: ${user.username}`, req.ip);

        res.json(updatedUser.toObject({ transform: (doc, ret) => { delete ret.password; return ret; } }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete user (admin only - soft delete)
app.delete('/api/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.deleted) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.deleted = true;
        await user.save();

        // Log audit
        await logAudit('DELETE', 'USER', user._id, user.username, req.user.id, req.user.username,
            { username: user.username, role: user.role }, null,
            `User deleted: ${user.username}`, req.ip);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change password (user endpoint - requires old password verification)
app.post('/api/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'Old password, new password, and confirmation required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ error: 'New password must be different from old password' });
        }

        // Get the user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Log audit
        await logAudit('CHANGE_PASSWORD', 'USER', user._id, user.username, req.user.id, req.user.username,
            null, null,
            `User changed their password: ${user.username}`, req.ip);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== TASKS ENDPOINTS ====================

// Get all tasks (admin only)
app.get('/api/tasks', verifyAdmin, async (req, res) => {
    try {
        const tasks = await Task.find({ deleted: false })
            .populate('assignedOrganizers', 'username role');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get tasks assigned to current user (protected)
app.get('/api/tasks/my-tasks', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const tasks = await Task.find({
            deleted: false,
            assignedOrganizers: userId
        }).populate('assignedOrganizers', 'username role');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single task by ID (admin only)
app.get('/api/tasks/:id', verifyAdmin, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedOrganizers', 'username role');
        if (!task || task.deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new task (admin only)
app.post('/api/tasks', verifyAdmin, async (req, res) => {
    try {
        const { name, category, maxPoints, assignedOrganizers, note, day, isAllDay, startTime, endTime } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Task name required' });
        }

        if (!day) {
            return res.status(400).json({ error: 'Day is required (Day 1, Day 2, or Day 3)' });
        }

        const newTask = await Task.create({
            name,
            category: category || '',
            maxPoints: maxPoints || 100,
            assignedOrganizers: assignedOrganizers || [],
            note: note || '',
            day,
            isAllDay: isAllDay || false,
            startTime: startTime || '',
            endTime: endTime || ''
        });

        const populatedTask = await newTask.populate('assignedOrganizers', 'username role');

        // Log audit
        await logAudit('CREATE', 'TASK', newTask._id, name, req.user.id, req.user.username, null,
            { name, category, maxPoints, day }, `Task created: ${name}`, req.ip);

        res.status(201).json(populatedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task (admin only)
app.put('/api/tasks/:id', verifyAdmin, async (req, res) => {
    try {
        const { name, category, maxPoints, assignedOrganizers, note, day, isAllDay, startTime, endTime } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task || task.deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const previousValues = { name: task.name, maxPoints: task.maxPoints, day: task.day };

        if (name) task.name = name;
        if (category !== undefined) task.category = category;
        if (maxPoints !== undefined) task.maxPoints = maxPoints;
        if (assignedOrganizers) task.assignedOrganizers = assignedOrganizers;
        if (note !== undefined) task.note = note;
        if (day) task.day = day;
        if (isAllDay !== undefined) task.isAllDay = isAllDay;
        if (startTime !== undefined) task.startTime = startTime;
        if (endTime !== undefined) task.endTime = endTime;

        const updatedTask = await task.save();
        const populatedTask = await updatedTask.populate('assignedOrganizers', 'username role');

        // Log audit
        await logAudit('UPDATE', 'TASK', task._id, task.name, req.user.id, req.user.username,
            previousValues, { name: task.name, category: task.category, maxPoints: task.maxPoints, day: task.day },
            `Task updated: ${task.name}`, req.ip);

        res.json(populatedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task (admin only - soft delete)
app.delete('/api/tasks/:id', verifyAdmin, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task || task.deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }

        task.deleted = true;
        await task.save();

        // Log audit
        await logAudit('DELETE', 'TASK', task._id, task.name, req.user.id, req.user.username,
            { name: task.name, maxPoints: task.maxPoints }, null,
            `Task deleted: ${task.name}`, req.ip);

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== SCORES ENDPOINTS ====================

// Get all scores (admin only)
app.get('/api/scores', verifyAdmin, async (req, res) => {
    try {
        const scores = await Score.find({ deleted: false })
            .populate('taskId', 'name maxPoints')
            .populate('teamId', 'name')
            .populate('organizerId', 'username');
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's own submitted scores
app.get('/api/my-scores', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const scores = await Score.find({ organizerId: userId, deleted: false })
            .populate('taskId', 'name maxPoints')
            .populate('teamId', 'name')
            .sort({ createdAt: -1 });
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or update score (users can score their assigned tasks)
app.post('/api/user-scores', verifyToken, async (req, res) => {
    try {
        const { taskId, teamId, points, comment } = req.body;
        const userId = req.user.id;

        if (!taskId || !teamId || points === undefined || points === null) {
            return res.status(400).json({ error: 'taskId, teamId, and points required' });
        }

        // Verify user is assigned to this task
        const task = await Task.findById(taskId);
        if (!task || task.deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const isAssigned = task.assignedOrganizers.some(org => org.toString() === userId);
        if (!isAssigned) {
            return res.status(403).json({ error: 'You are not assigned to this task' });
        }

        // Validate points don't exceed maxPoints
        if (points < 0 || points > task.maxPoints) {
            return res.status(400).json({ error: `Points must be between 0 and ${task.maxPoints}` });
        }

        // Find or create score
        let score = await Score.findOne({ taskId, teamId, deleted: false });
        let isNew = !score;

        if (!score) {
            score = new Score({ taskId, teamId, organizerId: userId, points, comment });
        } else {
            score.points = points;
            if (comment) score.comment = comment;
        }

        const previousValues = isNew ? null : { points: score.points };
        const savedScore = await score.save();

        // Update team total score
        const teamScores = await Score.aggregate([
            { $match: { teamId: new mongoose.Types.ObjectId(teamId), deleted: false } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);

        const teamTotal = teamScores.length > 0 ? teamScores[0].total : 0;
        await Team.findByIdAndUpdate(teamId, { totalScore: teamTotal });

        const populatedScore = await Score.findById(savedScore._id)
            .populate('taskId', 'name maxPoints')
            .populate('teamId', 'name')
            .populate('organizerId', 'username');

        // Log audit
        const action = isNew ? 'CREATE' : 'UPDATE';
        await logAudit(action, 'SCORE', savedScore._id, `Score: ${taskId}-${teamId}`, userId, req.user.username,
            previousValues, { points, comment }, `Score ${action}: ${points} points`, req.ip);

        // Log user history
        const userAction = isNew ? 'SUBMIT_SCORE' : 'UPDATE_SCORE';
        const taskName = populatedScore.taskId?.name || 'Unknown Task';
        const teamName = populatedScore.teamId?.name || 'Unknown Team';
        const description = `${userAction === 'SUBMIT_SCORE' ? 'Submitted' : 'Updated'} ${points} points to ${teamName} for task ${taskName}`;
        await logUserHistory(userId, req.user.username, userAction, 'SCORE', {
            taskName,
            teamName,
            points,
            maxPoints: task.maxPoints,
            comment,
            previousPoints: previousValues?.points || null
        }, description, req.user.role);

        res.status(isNew ? 201 : 200).json(populatedScore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or update score (admin can override)
app.post('/api/scores', verifyAdmin, async (req, res) => {
    try {
        const { taskId, teamId, organizerId, points, comment } = req.body;
        if (!taskId || !teamId || points === undefined || points === null) {
            return res.status(400).json({ error: 'taskId, teamId, and points required' });
        }

        // Find or create score
        let score = await Score.findOne({ taskId, teamId, deleted: false });
        let isNew = !score;

        if (!score) {
            score = new Score({ taskId, teamId, organizerId, points, comment });
        } else {
            score.points = points;
            if (comment) score.comment = comment;
        }

        const previousValues = isNew ? null : { points: score.points };
        const savedScore = await score.save();

        // Update team total score
        const teamScores = await Score.aggregate([
            { $match: { teamId: new mongoose.Types.ObjectId(teamId), deleted: false } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);

        const teamTotal = teamScores.length > 0 ? teamScores[0].total : 0;
        await Team.findByIdAndUpdate(teamId, { totalScore: teamTotal });

        const populatedScore = await Score.findById(savedScore._id)
            .populate('taskId', 'name maxPoints')
            .populate('teamId', 'name')
            .populate('organizerId', 'username');

        // Log audit
        const action = isNew ? 'CREATE' : 'OVERRIDE';
        await logAudit(action, 'SCORE', savedScore._id, `Score: ${taskId}-${teamId}`, req.user.id, req.user.username,
            previousValues, { points, comment }, `Score ${action}: ${points} points`, req.ip);

        // Log user history
        const taskName = populatedScore.taskId?.name || 'Unknown Task';
        const teamName = populatedScore.teamId?.name || 'Unknown Team';
        const userAction = isNew ? 'SUBMIT_SCORE' : 'UPDATE_SCORE';
        const description = `${isNew ? 'Assigned' : 'Updated'} ${points} points to ${teamName} for task ${taskName}`;
        await logUserHistory(req.user.id, req.user.username, userAction, 'SCORE', {
            taskName,
            teamName,
            points,
            maxPoints: populatedScore.taskId?.maxPoints,
            comment: comment || ''
        }, description, req.user.role);

        res.status(isNew ? 201 : 200).json(populatedScore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete score (admin only - soft delete)
app.delete('/api/scores/:id', verifyAdmin, async (req, res) => {
    try {
        const score = await Score.findById(req.params.id);
        if (!score || score.deleted) {
            return res.status(404).json({ error: 'Score not found' });
        }

        // Get task and team info before deleting
        const task = await Task.findById(score.taskId);
        const team = await Team.findById(score.teamId);

        score.deleted = true;
        await score.save();

        // Recalculate team total
        const teamScores = await Score.aggregate([
            { $match: { teamId: score.teamId, deleted: false } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);
        const teamTotal = teamScores.length > 0 ? teamScores[0].total : 0;
        await Team.findByIdAndUpdate(score.teamId, { totalScore: teamTotal });

        // Log audit
        await logAudit('DELETE', 'SCORE', score._id, `Score: ${score.taskId}-${score.teamId}`,
            req.user.id, req.user.username, { points: score.points }, null,
            `Score deleted: ${score.points} points`, req.ip);

        // Log user history
        const taskName = task?.name || 'Unknown Task';
        const teamName = team?.name || 'Unknown Team';
        const description = `Deleted score of ${score.points} points from ${teamName} for task ${taskName}`;
        await logUserHistory(req.user.id, req.user.username, 'DELETE_SCORE', 'SCORE', {
            taskName,
            teamName,
            points: score.points
        }, description, req.user.role);

        res.json({ message: 'Score deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get deleted scores (admin only)
app.get('/api/scores/deleted', verifyAdmin, async (req, res) => {
    try {
        const scores = await Score.find({ deleted: true })
            .populate('taskId', 'name maxPoints day')
            .populate('teamId', 'name')
            .populate('organizerId', 'username')
            .sort({ updatedAt: -1 });
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update score (admin only)
app.put('/api/scores/:id', verifyAdmin, async (req, res) => {
    try {
        const { points, comment } = req.body;
        const score = await Score.findById(req.params.id);

        if (!score || score.deleted) {
            return res.status(404).json({ error: 'Score not found' });
        }

        // Validation
        const task = await Task.findById(score.taskId);
        if (points > task.maxPoints || points < 0) {
            return res.status(400).json({ error: `Points must be between 0 and ${task.maxPoints}` });
        }

        const previousPoints = score.points;
        score.points = points;
        if (comment !== undefined) score.comment = comment;
        const savedScore = await score.save();

        // Recalculate team total
        const teamScores = await Score.aggregate([
            { $match: { teamId: score.teamId, deleted: false } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);
        const teamTotal = teamScores.length > 0 ? teamScores[0].total : 0;
        await Team.findByIdAndUpdate(score.teamId, { totalScore: teamTotal });

        // Log audit
        await logAudit('UPDATE', 'SCORE', savedScore._id, `Score: ${score.taskId}-${score.teamId}`,
            req.user.id, req.user.username, { points: previousPoints }, { points, comment },
            `Score updated: ${previousPoints} → ${points} points`, req.ip);

        const populatedScore = await Score.findById(savedScore._id)
            .populate('taskId', 'name maxPoints')
            .populate('teamId', 'name')
            .populate('organizerId', 'username');

        // Log user history
        const teamName = populatedScore.teamId?.name || 'Unknown Team';
        const taskName = populatedScore.taskId?.name || 'Unknown Task';
        const description = `Updated score from ${previousPoints} to ${points} points for ${teamName} in task ${taskName}`;
        await logUserHistory(req.user.id, req.user.username, 'UPDATE_SCORE', 'SCORE', {
            taskName,
            teamName,
            points,
            maxPoints: populatedScore.taskId?.maxPoints,
            previousPoints,
            comment: comment || ''
        }, description, req.user.role);

        res.json(populatedScore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restore deleted score (admin only)
app.put('/api/scores/:id/restore', verifyAdmin, async (req, res) => {
    try {
        const score = await Score.findById(req.params.id);

        if (!score || !score.deleted) {
            return res.status(404).json({ error: 'Deleted score not found' });
        }

        score.deleted = false;
        const savedScore = await score.save();

        // Recalculate team total
        const teamScores = await Score.aggregate([
            { $match: { teamId: score.teamId, deleted: false } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);
        const teamTotal = teamScores.length > 0 ? teamScores[0].total : 0;
        await Team.findByIdAndUpdate(score.teamId, { totalScore: teamTotal });

        // Log audit
        await logAudit('RESTORE', 'SCORE', savedScore._id, `Score: ${score.taskId}-${score.teamId}`,
            req.user.id, req.user.username, { deleted: true }, { deleted: false },
            `Score restored: ${score.points} points`, req.ip);

        const populatedScore = await Score.findById(savedScore._id)
            .populate('taskId', 'name maxPoints')
            .populate('teamId', 'name')
            .populate('organizerId', 'username');

        res.json(populatedScore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== LEADERBOARD ENDPOINTS ====================

// Get team leaderboard (admin only)
app.get('/api/leaderboard/teams', verifyAdmin, async (req, res) => {
    try {
        const teams = await Team.find({ deleted: false })
            .select('name totalScore')
            .sort({ totalScore: -1 })
            .lean();
        const leaderboard = teams.map((team, index) => ({
            rank: index + 1,
            ...team
        }));
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get individual leaderboard (admin only) - aggregated by organizer
app.get('/api/leaderboard/individuals', verifyAdmin, async (req, res) => {
    try {
        const scoreboard = await Score.aggregate([
            { $match: { deleted: false } },
            { $group: { _id: '$organizerId', totalPoints: { $sum: '$points' } } },
            { $sort: { totalPoints: -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'organizer' } }
        ]);

        const leaderboard = await Promise.all(scoreboard.map(async (entry, index) => {
            const user = await User.findById(entry._id).select('username role');
            return {
                rank: index + 1,
                userId: entry._id,
                username: user?.username || 'Unknown',
                totalPoints: entry.totalPoints
            };
        }));

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== AUDIT LOG ENDPOINTS ====================

// Get audit logs (admin only)
app.get('/api/audit-logs', verifyAdmin, async (req, res) => {
    try {
        const { entityType, action, limit = 100, skip = 0 } = req.query;
        let filter = { deleted: false };
        if (entityType) filter.entityType = entityType;
        if (action) filter.action = action;

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('performedBy', 'username');

        const total = await AuditLog.countDocuments(filter);

        res.json({
            logs,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== TEAMS ENDPOINTS ====================

// Get all teams (protected)
app.get('/api/teams', verifyToken, async (req, res) => {
    try {
        const teams = await Team.find({ deleted: false });
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new team (admin only)
app.post('/api/teams', verifyAdmin, async (req, res) => {
    try {
        const { name, members } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        // Check if team already exists
        const existing = await Team.findOne({ name, deleted: false });
        if (existing) {
            return res.status(409).json({ error: 'Team with this name already exists' });
        }

        const newTeam = new Team({
            name,
            members: members || [],
            totalScore: 0
        });

        const savedTeam = await newTeam.save();

        // Log audit
        await logAudit('CREATE', 'TEAM', savedTeam._id, name, req.user.id, req.user.username,
            null, { name, members }, `Created team: ${name}`, req.ip);

        res.status(201).json(savedTeam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update team (admin only)
app.put('/api/teams/:teamId', verifyAdmin, async (req, res) => {
    try {
        const { name, members } = req.body;
        const team = await Team.findById(req.params.teamId);

        if (!team || team.deleted) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const previousValues = { name: team.name, members: team.members };

        if (name) team.name = name;
        if (members !== undefined) team.members = members;

        const updatedTeam = await team.save();

        // Log audit
        await logAudit('UPDATE', 'TEAM', updatedTeam._id, name || team.name, req.user.id, req.user.username,
            previousValues, { name, members }, `Updated team: ${updatedTeam.name}`, req.ip);

        res.json(updatedTeam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete team (soft delete - admin only)
app.delete('/api/teams/:teamId', verifyAdmin, async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);

        if (!team || team.deleted) {
            return res.status(404).json({ error: 'Team not found' });
        }

        team.deleted = true;
        const deletedTeam = await team.save();

        // Log audit
        await logAudit('DELETE', 'TEAM', team._id, team.name, req.user.id, req.user.username,
            { name: team.name }, null, `Deleted team: ${team.name}`, req.ip);

        res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== USER HISTORY ENDPOINTS ====================

// Get current user's history
app.get('/api/user-history/my-history', verifyToken, async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;
        const userId = req.user.id;

        const history = await UserHistory.find({ userId, deleted: false })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await UserHistory.countDocuments({ userId, deleted: false });

        res.json({
            history,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users' history (admin only)
app.get('/api/user-history/all', verifyAdmin, async (req, res) => {
    try {
        const { userId, action, limit = 50, skip = 0 } = req.query;
        let filter = { deleted: false };
        if (userId) filter.userId = userId;
        if (action) filter.action = action;

        const history = await UserHistory.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await UserHistory.countDocuments(filter);

        res.json({
            history,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Database connection and server startup
mongoose.connect(mongoUri)
    .then(async () => {
        console.log('✅ MongoDB connected');

        // Insert demo teams if database is empty
        if (await Team.countDocuments() === 0) {
            const demoTeams = [
                { name: 'Team Alpha', totalScore: 150 },
                { name: 'Team Beta', totalScore: 120 },
                { name: 'Team Gamma', totalScore: 90 }
            ];
            await Team.insertMany(demoTeams);
            console.log('✅ Demo teams created');
        }

        // Initialize default users (create if missing, restore if deleted, update password)
        try {
            // Helper function to ensure a user exists with fresh password
            const ensureUser = async (username, password, role) => {
                const hashedPassword = await bcrypt.hash(password, 10);

                // Check if user exists (regardless of deleted status)
                let user = await User.findOne({ username });

                if (!user) {
                    // Create new user
                    user = await User.create({
                        username,
                        password: hashedPassword,
                        role
                    });
                    console.log(`✅ User '${username}' created`);
                } else if (user.deleted) {
                    // Restore deleted user
                    user.deleted = false;
                    user.password = hashedPassword;
                    user.role = role;
                    await user.save();
                    console.log(`✅ User '${username}' restored and password updated`);
                } else {
                    // User exists and is active, just update password
                    user.password = hashedPassword;
                    await user.save();
                    console.log(`✅ User '${username}' password updated`);
                }
            };

            // Initialize both users
            await ensureUser('Gothar az admin', INITIAL_ADMIN_PASSWORD, 'ADMIN');
            await ensureUser('Gothar a user', INITIAL_USER_PASSWORD, 'ORGANIZER');

            console.log('📋 Default credentials available:');
            console.log(`   Admin - username: Gothar az admin, password: ${INITIAL_ADMIN_PASSWORD}`);
            console.log(`   User  - username: Gothar a user,  password: ${INITIAL_USER_PASSWORD}`);
        } catch (err) {
            console.error('⚠️  Error initializing users:', err.message);
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });