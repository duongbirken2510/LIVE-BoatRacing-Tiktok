import { useEffect, useState } from 'react';
import { IS_STAGE } from './live/page';
import { StageFrame } from './live/StageFrame';
import { Dashboard } from './live/Dashboard';
import { voice } from './live/voice';
import { sfx } from './game/sfx';
import { useGame } from './game/useGame';
import { GameStage } from './game/GameStage';
import { GameControls } from './game/GameControls';

export default function App() {
  const game = useGame();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    voice.onBlocked = () => setBlocked(true);
  }, []);

  if (IS_STAGE) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center bg-black"
        onClick={() => {
          setBlocked(false);
          sfx.resume();
        }}
      >
        <StageFrame>
          <GameStage game={game} />
        </StageFrame>
        {blocked && (
          <button className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-amber-500 px-8 py-4 text-2xl font-bold text-white shadow-2xl">
            🔊 Bấm vào đây để bật tiếng
          </button>
        )}
      </div>
    );
  }

  return (
    <Dashboard
      status={game.status}
      vieneu={game.vieneu}
      stageCount={game.stageCount}
      phase={game.view?.phase}
      channelName={game.channelName}
      extra={<GameControls caiDat={game.caiDat} />}
      preview={
        <StageFrame maxHeight={740}>
          <GameStage game={game} lite />
        </StageFrame>
      }
    />
  );
}
