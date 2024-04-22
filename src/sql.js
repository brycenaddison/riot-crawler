const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
  }
);

const Match = sequelize.define(
  'Match',
  {
    matchId: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    ranks: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },
    patch: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    gameCreation: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    gameDuration: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    gameMode: {
      type: Sequelize.STRING,
    },
    gameType: {
      type: Sequelize.STRING,
    },
    queueId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  },
  { timestamps: false }
);

const Summoner = sequelize.define(
  'Summoner',
  {
    puuid: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    accountId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    rankedTier: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

const PlayerInherent = sequelize.define(
  'PlayerInherent',
  {
    matchId: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Matches',
        key: 'matchId',
      },
    },
    participantId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    championName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    puuid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    teamId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    teamPosition: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    win: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
  },
  { timestamps: false }
);

const TeamTimestamp = sequelize.define(
  'TeamTimestamp',
  {
    matchId: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Matches',
        key: 'matchId',
      },
    },
    teamId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    timestamp: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    ...Object.fromEntries(
      [
        'baronKills',
        'hordeKills',
        'earthDragonKills',
        'fireDragonKills',
        'waterDragonKills',
        'airDragonKills',
        'elderDragonKills',
        'chemDragonKills',
        'hexDragonKills',
        'riftHeraldKills',
        'innerTurretKills',
        'outerTurretKills',
        'baseTurretKills',
        'nexusTurretKills',
        'inhibitorKills',
        'turretPlateKills',
      ].map((key) => [
        key,
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
      ])
    ),
  },
  { timestamps: false }
);

const PlayerTimestamp = sequelize.define(
  'PlayerTimestamp',
  {
    matchId: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Matches',
        key: 'matchId',
      },
    },
    participantId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    timestamp: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    ...Object.fromEntries(
      [
        'abilityHaste',
        'abilityPower',
        'armor',
        'armorPen',
        'armorPenPercent',
        'attackDamage',
        'attackSpeed',
        'bonusArmorPenPercent',
        'bonusMagicPenPercent',
        'ccReduction',
        'cooldownReduction',
        'health',
        'healthMax',
        'healthRegen',
        'lifesteal',
        'magicPen',
        'magicPenPercent',
        'magicResist',
        'movementSpeed',
        'physicalVamp',
        'power',
        'powerMax',
        'powerRegen',
        'spellVamp',
        'currentGold',
        'magicDamageDone',
        'magicDamageDoneToChampions',
        'magicDamageTaken',
        'physicalDamageDone',
        'physicalDamageDoneToChampions',
        'physicalDamageTaken',
        'totalDamageDone',
        'totalDamageDoneToChampions',
        'totalDamageTaken',
        'trueDamageDone',
        'trueDamageDoneToChampions',
        'trueDamageTaken',
        'goldPerSecond',
        'jungleMinionsKilled',
        'level',
        'minionsKilled',
        'x',
        'y',
        'timeEnemySpentControlled',
        'totalGold',
        'xp',
        'kills',
        'assists',
        'deaths',
        'wardsPlaced',
        'wardsKilled',
      ].map((key) => [
        key,
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
      ])
    ),
  },
  { timestamps: false }
);

module.exports = {
  async start() {
    await sequelize
      .authenticate()
      .then(() => {
        console.log('Connection has been established successfully.');
      })
      .catch((err) => {
        console.error('Unable to connect to the database:', err);
      });

    await sequelize
      .sync()
      .then(() => console.log('Database has been synced with models.'))
      .catch((err) => console.error('Unable to sync database:', err));
  },
  TeamTimestamp,
  PlayerTimestamp,
  Summoner,
  PlayerInherent,
  Match,
};
