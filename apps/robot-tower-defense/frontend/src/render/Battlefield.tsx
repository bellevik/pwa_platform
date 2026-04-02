import type { ReactNode } from 'react';
import { getEnemyDefinition, getTowerDefinition, getTowerTier } from '../game/balance';
import { getEnemyPosition } from '../game/engine';
import type { BattleState, StageDefinition } from '../game/types';

type BattlefieldProps = {
  stage: StageDefinition;
  battle: BattleState;
  selectedPadId: string | null;
  selectedTowerId: number | null;
  onSelectPad: (padId: string) => void;
  onSelectTower: (towerId: number) => void;
};

export function Battlefield({
  stage,
  battle,
  selectedPadId,
  selectedTowerId,
  onSelectPad,
  onSelectTower
}: BattlefieldProps) {
  const towersByPad = new Map(battle.towers.map((tower) => [tower.padId, tower]));
  const enemyPoints = new Map(battle.enemies.map((enemy) => [enemy.id, getEnemyPosition(stage, enemy.progress)]));
  const reactor = stage.path[stage.path.length - 1];

  return (
    <div className="battlefield-shell">
      <svg
        aria-label={`${stage.name} battlefield`}
        className="battlefield"
        viewBox={`0 0 ${stage.boardWidth} ${stage.boardHeight}`}
      >
        <defs>
          <linearGradient id="laneGlow" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(79, 255, 219, 0.95)" />
            <stop offset="100%" stopColor="rgba(255, 138, 72, 0.95)" />
          </linearGradient>
          <linearGradient id="laneMetal" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#263f47" />
            <stop offset="100%" stopColor="#162831" />
          </linearGradient>
          <radialGradient id="reactorGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#b9fbff" />
            <stop offset="55%" stopColor="#52f0ff" />
            <stop offset="100%" stopColor="rgba(82, 240, 255, 0)" />
          </radialGradient>
          <pattern id="gridPattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(141, 210, 220, 0.08)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect className="battlefield-bg" width={stage.boardWidth} height={stage.boardHeight} rx="28" />
        <rect className="battlefield-grid" width={stage.boardWidth} height={stage.boardHeight} rx="28" fill="url(#gridPattern)" />
        <g className="battlefield-zoom" transform="translate(-18 -16) scale(1.1)">
          <path
            className="battlefield-lane-shadow"
            d={buildPathD(stage.path)}
            fill="none"
            stroke="#081217"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="40"
          />
          <path
            className="battlefield-lane"
            d={buildPathD(stage.path)}
            fill="none"
            stroke="url(#laneMetal)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="28"
          />
          <path
            className="battlefield-lane-glow"
            d={buildPathD(stage.path)}
            fill="none"
            stroke="url(#laneGlow)"
            strokeDasharray="12 10"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.65"
            strokeWidth="6"
          />

          <circle className="entry-beacon" cx={stage.path[0].x} cy={stage.path[0].y} r="16" />
          <circle className="reactor-core-glow" cx={reactor.x} cy={reactor.y} r="34" fill="url(#reactorGlow)" />
          <g className="reactor-core" transform={`translate(${reactor.x} ${reactor.y})`}>
            <circle r="19" fill="#0f3641" stroke="#9dffff" strokeWidth="4" />
            <circle r="10" fill="#52f0ff" />
            <path d="M -9 -2 L 0 -13 L 9 -2 L 0 13 Z" fill="#dfffff" opacity="0.8" />
          </g>

          {stage.pads.map((pad) => {
            const tower = towersByPad.get(pad.id);
            const isSelected = selectedPadId === pad.id || (tower ? selectedTowerId === tower.id : false);

            return (
              <g key={pad.id} transform={`translate(${pad.x} ${pad.y})`}>
                <circle className={`pad-shadow ${isSelected ? 'is-selected' : ''}`} r="22" />
                <PadButton x={-24} y={-24} width={48} height={48} onClick={() => onSelectPad(pad.id)}>
                  <div className={`pad-hit-target ${isSelected ? 'is-selected' : ''}`} />
                </PadButton>
                <circle className={`build-pad ${tower ? 'is-occupied' : ''} ${isSelected ? 'is-selected' : ''}`} r="18" />
                <circle className="build-pad-inner" r="10" />
                {!tower ? <path className="pad-plus" d="M -7 0 H 7 M 0 -7 V 7" /> : null}
              </g>
            );
          })}

          {battle.towers.map((tower) => {
            const pad = stage.pads.find((padItem) => padItem.id === tower.padId);

            if (!pad) {
              return null;
            }

            const definition = getTowerDefinition(tower.typeId);
            const tier = getTowerTier(tower);
            const isSelected = selectedTowerId === tower.id;

            return (
              <g
                className="tower-group"
                key={tower.id}
                transform={`translate(${pad.x} ${pad.y})`}
                onClick={() => onSelectTower(tower.id)}
              >
                {isSelected ? <circle className="tower-range" r={tier.range} /> : null}
                <circle className={`tower-base ${isSelected ? 'is-selected' : ''}`} r="14" fill={definition.body} />
                <circle className="tower-core" r="7" fill={definition.accent} />
                <path className="tower-body" d="M -10 9 L -6 -8 L 6 -8 L 10 9 Z" fill={definition.body} />
                <rect x={-4} y={-18} width={8} height={14} rx={3} fill={definition.barrel} />
                {tower.typeId === 'arc' ? <circle cx="0" cy="-18" r="4" fill="#d8fbff" /> : null}
                {tower.typeId === 'mortar' ? <circle cx="0" cy="-14" r="6" fill="#ffd8ca" /> : null}
                {tower.typeId === 'rail' ? <rect x={-6} y={-22} width={12} height={7} rx={3} fill="#ffeec2" /> : null}
                {tower.typeId === 'cryo' ? <path d="M -8 -12 L 0 -22 L 8 -12" fill="none" stroke="#c6ffff" strokeWidth="4" strokeLinecap="round" /> : null}
                <text className="tower-level" x="0" y="24">{tower.level + 1}</text>
              </g>
            );
          })}

          {battle.shots.map((shot) => {
            if (shot.kind === 'arc') {
              return (
                <polyline
                  className="shot-arc"
                  key={shot.id}
                  points={shot.points.map((point) => `${point.x},${point.y}`).join(' ')}
                />
              );
            }

            if (shot.kind === 'mortar') {
              const [origin, target] = shot.points;
              const midX = (origin.x + target.x) / 2;
              const midY = Math.min(origin.y, target.y) - 48;
              return (
                <g key={shot.id}>
                  <path
                    className="shot-mortar"
                    d={`M ${origin.x} ${origin.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                  />
                  <circle className="shot-blast" cx={target.x} cy={target.y} r={shot.explosionRadius ?? 0} />
                </g>
              );
            }

            const [start, end] = shot.points;
            return <line className={`shot-beam shot-${shot.kind}`} key={shot.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
          })}

          {battle.enemies.map((enemy) => {
            const point = enemyPoints.get(enemy.id);

            if (!point) {
              return null;
            }

            const definition = getEnemyDefinition(enemy.typeId);
            const healthWidth = (enemy.health / definition.health) * 26;
            const shieldWidth = definition.shield > 0 ? (enemy.shield / definition.shield) * 26 : 0;

            return (
              <g className="enemy-group" key={enemy.id} transform={`translate(${point.x} ${point.y})`}>
                {definition.id === 'shield-drone' ? <circle className="enemy-shield" r={definition.size + 4} /> : null}
                {definition.tags.includes('boss') ? <circle className="enemy-boss-ring" r={definition.size + 7} /> : null}
                <rect
                  x={-definition.size}
                  y={-definition.size * 0.8}
                  width={definition.size * 2}
                  height={definition.size * 1.6}
                  rx={definition.size * 0.45}
                  fill={definition.body}
                />
                <circle cx={-definition.size * 0.35} cy={-2} r={definition.size * 0.18} fill="#e9ffff" />
                <circle cx={definition.size * 0.35} cy={-2} r={definition.size * 0.18} fill="#e9ffff" />
                <rect
                  x={-definition.size * 0.55}
                  y={definition.size * 0.2}
                  width={definition.size * 1.1}
                  height={definition.size * 0.18}
                  rx="4"
                  fill={definition.accent}
                />
                <rect className="enemy-health-bg" x="-13" y={-definition.size - 10} width="26" height="4" rx="2" />
                <rect className="enemy-health" x="-13" y={-definition.size - 10} width={Math.max(0, healthWidth)} height="4" rx="2" />
                {shieldWidth > 0 ? <rect className="enemy-shield-bar" x="-13" y={-definition.size - 16} width={Math.max(0, shieldWidth)} height="3" rx="2" /> : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function buildPathD(points: StageDefinition['path']): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

type ForeignButtonProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
  children: ReactNode;
};

function PadButton({ x, y, width, height, onClick, children }: ForeignButtonProps) {
  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <button className="pad-button" type="button" onClick={onClick}>
        {children}
      </button>
    </foreignObject>
  );
}
