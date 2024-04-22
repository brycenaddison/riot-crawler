const {
  PlayerTimestamp,
  TeamTimestamp,
  Summoner,
  PlayerInherent,
  Match,
} = require('./sql');

class MatchError extends Error {
  constructor(...args) {
    super(args);
  }
}

const flatten = (obj) =>
  Object.assign(
    {},
    ...(function _flatten(o) {
      return [].concat(
        ...Object.keys(o).map((k) =>
          typeof o[k] === 'object' ? _flatten(o[k]) : { [k]: o[k] }
        )
      );
    })(obj)
  );

const processTimeline = (timeline) => {
  const totals = {
    100: {
      baronKills: 0,
      hordeKills: 0,
      earthDragonKills: 0,
      fireDragonKills: 0,
      waterDragonKills: 0,
      airDragonKills: 0,
      elderDragonKills: 0,
      chemDragonKills: 0,
      hexDragonKills: 0,
      riftHeraldKills: 0,
      kills: 0,
      innerTurretKills: 0,
      outerTurretKills: 0,
      baseTurretKills: 0,
      nexusTurretKills: 0,
      inhibitorKills: 0,
      turretPlateKills: 0,
      wardsPlaced: 0,
      wardsKilled: 0,
    },
    200: {
      baronKills: 0,
      hordeKills: 0,
      earthDragonKills: 0,
      fireDragonKills: 0,
      waterDragonKills: 0,
      airDragonKills: 0,
      elderDragonKills: 0,
      chemDragonKills: 0,
      hexDragonKills: 0,
      riftHeraldKills: 0,
      kills: 0,
      innerTurretKills: 0,
      outerTurretKills: 0,
      baseTurretKills: 0,
      nexusTurretKills: 0,
      inhibitorKills: 0,
      turretPlateKills: 0,
      wardsPlaced: 0,
      wardsKilled: 0,
    },
  };
  try {
    const playerTotals = Object.fromEntries(
      timeline.info.participants.map((p) => [
        p.participantId,
        { kills: 0, deaths: 0, assists: 0, wardsPlaced: 0, wardsKilled: 0 },
      ])
    );

    const { matchId } = timeline.metadata;
    const promises = [];

    timeline.info.frames.forEach((frame) => {
      frame.events.forEach((event) => {
        switch (event.type) {
          case 'CHAMPION_KILL':
            if (event.killerId !== 0) {
              playerTotals[event.killerId].kills += 1;
            }
            playerTotals[event.victimId].deaths += 1;
            if (event.assistingParticipantIds) {
              event.assistingParticipantIds.forEach((id) => {
                playerTotals[id].assists += 1;
              });
            }
            break;
          case 'WARD_PLACED':
            if (
              event.wardType === 'YELLOW_TRINKET' ||
              event.wardType === 'CONTROL_WARD' ||
              event.wardType === 'SIGHT_WARD' ||
              event.wardType === 'BLUE_TRINKET'
            ) {
              playerTotals[event.creatorId].wardsPlaced += 1;
            }
            break;
          case 'WARD_KILL':
            if (
              event.wardType === 'YELLOW_TRINKET' ||
              event.wardType === 'CONTROL_WARD' ||
              event.wardType === 'SIGHT_WARD' ||
              event.wardType === 'BLUE_TRINKET'
            ) {
              playerTotals[event.killerId].wardsKilled += 1;
            }
            break;
          case 'BUILDING_KILL':
            switch (event.buildingType) {
              case 'TOWER_BUILDING':
                switch (event.towerType) {
                  case 'BASE_TURRET':
                    totals[event.teamId].baseTurretKills += 1;
                    break;
                  case 'INNER_TURRET':
                    totals[event.teamId].innerTurretKills += 1;
                    break;
                  case 'OUTER_TURRET':
                    totals[event.teamId].outerTurretKills += 1;
                    break;
                  case 'NEXUS_TURRET':
                    totals[event.teamId].nexusTurretKills += 1;
                    break;
                  default:
                    break;
                }
                break;
              case 'INHIBITOR_BUILDING':
                totals[event.teamId].inhibitorKills += 1;
                break;
              default:
                break;
            }
            break;
          case 'TURRET_PLATE_DESTROYED':
            totals[event.teamId].turretPlateKills += 1;
            break;
          case 'ELITE_MONSTER_KILL':
            if (event.killerTeamId !== 100 && event.killerTeamId !== 200) {
              return;
            }

            switch (event.monsterType) {
              case 'DRAGON':
                switch (event.monsterSubType) {
                  case 'FIRE_DRAGON':
                    totals[event.killerTeamId].fireDragonKills += 1;
                    break;
                  case 'WATER_DRAGON':
                    totals[event.killerTeamId].waterDragonKills += 1;
                    break;
                  case 'AIR_DRAGON':
                    totals[event.killerTeamId].airDragonKills += 1;
                    break;
                  case 'EARTH_DRAGON':
                    totals[event.killerTeamId].earthDragonKills += 1;
                    break;
                  case 'ELDER_DRAGON':
                    totals[event.killerTeamId].elderDragonKills += 1;
                    break;
                  case 'CHEMTECH_DRAGON':
                    totals[event.killerTeamId].chemDragonKills += 1;
                    break;
                  case 'HEXTECH_DRAGON':
                    totals[event.killerTeamId].hexDragonKills += 1;
                    break;
                  default:
                    break;
                }
                break;
              case 'RIFTHERALD':
                totals[event.killerTeamId].riftHeraldKills += 1;
                break;
              case 'BARON_NASHOR':
                totals[event.killerTeamId].baronKills += 1;
                break;
              case 'HORDE':
                totals[event.killerTeamId].hordeKills += 1;
                break;
              default:
                break;
            }
            break;
          default:
            break;
        }
      });

      Object.entries(totals).forEach(([teamId, t]) => {
        promises.push(
          TeamTimestamp.create({
            matchId,
            teamId,
            timestamp: frame.timestamp,
            ...t,
          }).catch((e) => {
            if (e.name === 'SequelizeUniqueConstraintError') {
              return null;
            }
            return Promise.reject(e);
          })
        );
      });

      Object.values(frame.participantFrames).forEach((p) => {
        promises.push(
          PlayerTimestamp.create({
            matchId,
            participantId: p.participantId,
            timestamp: frame.timestamp,
            ...flatten(p),
            ...playerTotals[p.participantId],
          }).catch((e) => {
            if (e.name === 'SequelizeUniqueConstraintError') {
              return null;
            }
            return Promise.reject(e);
          })
        );
      });
    });

    return Promise.all(promises);
  } catch (e) {
    return Promise.reject(e);
  }
};

const processSummoner = (summoner, rankedTier) =>
  Summoner.create({ ...summoner, rankedTier }).catch((e) => {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return null;
    }
    return Promise.reject(e);
  });

const getPuuids = () =>
  Summoner.findAll().then((summoners) => summoners.map((s) => s.puuid));

const getMatchIds = () =>
  Match.findAll().then((matches) => matches.map((p) => p.matchId));

const validateMatch = async (match, { tiers, patches, crawler }) => {
  const patch = match.info.gameVersion.split('.').slice(0, 2).join('.');

  if (!patches.includes(patch)) {
    throw new MatchError(`Invalid patch`);
  }

  if (
    match.info.gameMode !== 'CLASSIC' ||
    match.info.gameType !== 'MATCHED_GAME' ||
    match.info.queueId !== 420
  ) {
    throw new MatchError(`Invalid game mode`);
  }

  const gamePuuids = match.info.participants.map((p) => p.puuid);

  const gameTiers = [];

  await Promise.all(
    gamePuuids.map((puuid) =>
      Summoner.findByPk(puuid).then((s) => {
        if (!s) {
          return crawler.summoner(puuid).then((sum) => {
            // idk
            if (!sum) return false;
            if (sum.rankedTier) gameTiers.push(sum.rankedTier);
            return true;
          });
        }
        if (s.rankedTier) gameTiers.push(s.rankedTier);
        return true;
      })
    )
  ).catch((e) => {
    throw new Error(e);
  });

  gameTiers.forEach((tier) => {
    if (!tiers.includes(tier)) {
      throw new MatchError(`Invalid tier ${tier}`);
    }
  });

  await Match.create({
    matchId: match.metadata.matchId,
    ranks: gameTiers,
    patch,
    gameCreation: match.info.gameCreation,
    gameDuration: match.info.gameDuration,
    gameMode: match.info.gameMode,
    gameType: match.info.gameType,
    queueId: match.info.queueId,
  }).catch((e) => {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return null;
    }
    throw new Error(e);
  });

  return match;
};

const processMatch = async (match) => {
  const promises = [];

  match.info.participants.forEach((p) => {
    promises.push(
      PlayerInherent.create({
        matchId: match.metadata.matchId,
        participantId: p.participantId,
        championName: p.championName,
        puuid: p.puuid,
        teamId: p.teamId,
        teamPosition: p.teamPosition,
        win: p.win,
      }).catch((e) => {
        if (e.name === 'SequelizeUniqueConstraintError') {
          return null;
        }
        return Promise.reject(e);
      })
    );
  });
};

module.exports = {
  processTimeline,
  processSummoner,
  validateMatch,
  processMatch,
  getPuuids,
  getMatchIds,
  MatchError,
};
