import { useState, useEffect } from 'react';

const COLORS = {
  primary: '#877643',
  secondary: '#5a4f32',
  dark: '#2c2416',
  light: '#faf8f3',
  success: '#4caf50',
  warning: '#ff9800'
};

export default function Public() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [countdowns, setCountdowns] = useState({});
  const [currentStage, setCurrentStage] = useState('waiting');
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard and schedule
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scoreRes, scheduleRes] = await Promise.all([
          fetch('/api/public/leaderboard'),
          fetch('/api/public/schedule')
        ]);
        
        setLeaderboard(await scoreRes.json());
        setSchedule(await scheduleRes.json());
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);  // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Update countdowns every second
  useEffect(() => {
    if (!schedule?.startDate) return;

    const tick = setInterval(() => {
      const now = Date.now();
      const startTime = new Date(schedule.startDate).getTime();
      
      const day1Remaining = Math.max(0, startTime - now);
      const day2Time = startTime + schedule.day2Offset * 60000;
      const day2Remaining = Math.max(0, day2Time - now);
      const finalTime = startTime + schedule.finalOffset * 60000;
      const finalRemaining = Math.max(0, finalTime - now);

      setCountdowns({ day1: day1Remaining, day2: day2Remaining, final: finalRemaining });

      // Determine current stage
      if (now >= finalTime) setCurrentStage('final');
      else if (now >= day2Time) setCurrentStage('day2');
      else if (now >= startTime) setCurrentStage('day1');
      else setCurrentStage('waiting');
    }, 1000);

    return () => clearInterval(tick);
  }, [schedule]);

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;

  const formatCountdown = (ms) => {
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getScoresForStage = () => {
    if (currentStage === 'waiting' || !leaderboard) return [];
    if (currentStage === 'day1') return leaderboard.day1 || [];
    if (currentStage === 'day2') return leaderboard.day2 || [];
    if (currentStage === 'final') return leaderboard.final || [];
  };

  const scores = getScoresForStage();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '30px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: COLORS.dark }}>🏆 Game Pointer Leaderboard</h1>

      {/* Stage Indicator */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 40px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: `3px solid ${COLORS.primary}`,
        textAlign: 'center'
      }}>
        <h2 style={{ margin: 0, color: COLORS.primary }}>
          {currentStage === 'waiting' && '⏳ Waiting for Day 1 Results...'}
          {currentStage === 'day1' && '📊 Day 1 Results'}
          {currentStage === 'day2' && '📊 Day 2 Results'}
          {currentStage === 'final' && '🎉 FINAL RESULTS'}
        </h2>

        {/* Show appropriate countdown */}
        {currentStage === 'waiting' && (
          <p style={{ fontSize: '24px', color: COLORS.warning, fontWeight: 'bold' }}>
            ⏱️ Day 1 in: {formatCountdown(countdowns.day1)}
          </p>
        )}
        {currentStage === 'day1' && (
          <p style={{ fontSize: '20px', color: COLORS.info }}>
            Day 2 in: {formatCountdown(countdowns.day2)}
          </p>
        )}
        {currentStage === 'day2' && (
          <p style={{ fontSize: '20px', color: COLORS.info }}>
            Final in: {formatCountdown(countdowns.final)}
          </p>
        )}
        {currentStage === 'final' && (
          <p style={{ fontSize: '20px', color: COLORS.success }}>
            ✅ All results finalized
          </p>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {scores.length > 0 ? (
          <div style={{ display: 'grid', gap: '15px' }}>
            {scores
              .sort((a, b) => b.points - a.points)
              .map((team, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '20px',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: `2px solid ${COLORS.primary}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: COLORS.primary,
                    marginRight: '20px',
                    minWidth: '50px'
                  }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 5px 0', color: COLORS.dark }}>
                      {team.teamName}
                    </h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                      {team.revealedAt ? `Revealed at ${new Date(team.revealedAt).toLocaleTimeString()}` : 'Awaiting reveal...'}
                    </p>
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: COLORS.success,
                    textAlign: 'right'
                  }}>
                    {team.points}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div style={{
            padding: '40px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px' }}>👀 Scores not yet revealed for this stage</p>
            <p style={{ fontSize: '14px' }}>Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
