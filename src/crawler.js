const consola = require('consola');
const { RiotClient, NotFoundError, RateLimitError } = require('./riot');
const {
  processTimeline,
  processSummoner,
  validateMatch,
  processMatch,
  getMatchIds,
  MatchError,
  getPuuids,
} = require('./util');
const { start } = require('./sql');

const FRESH_SEED = 'NA1_4954804129';
const BATCH_SIZE = 10;
const BATCH_COOLDOWN = 10000;

module.exports = class Crawler {
  constructor({ broadcast }) {
    this.log = () => null;

    this.error = (message) => {
      consola.error(message);
      broadcast(`${message}`);
    };

    this.shout = (message) => {
      broadcast(`${message}`);
      consola.log(message);
    };

    start();
    this.riot = new RiotClient();
    this.potentialMatches = [];
    this.finishedMatches = [];

    getMatchIds().then((ids) => {
      this.finishedMatches = ids;
    });
  }

  download() {
    this.log('Not implemented');
  }

  crawl() {
    const batch = this.potentialMatches.slice(0, BATCH_SIZE + 1);
    this.shout(`BATCH: Attempting batch on ${batch.join(', ')}...`);

    Promise.all(batch.map((id) => this.match(id)))
      .then(() => {
        this.finishedMatches.push(...batch);
        this.potentialMatches = this.potentialMatches.slice(BATCH_SIZE + 1);
        this.shout('BATCH: Batch complete');

        if (this.potentialMatches.length > 0) {
          this.shout('BATCH: More matches to crawl, starting next batch...');
          this.crawl();
        } else {
          this.shout('BATCH: No more matches to crawl!');
        }
      })
      .catch((e) => {
        this.error(e);

        if (e instanceof RateLimitError) {
          this.shout(
            `BATCH: Rate limit error, retrying batch in ${BATCH_COOLDOWN / 1000} seconds...`
          );
        } else {
          this.shout(`BATCH: Uncaught error, trying new batch`);

          this.finishedMatches.push(...batch);
          this.potentialMatches = this.potentialMatches.slice(BATCH_SIZE + 1);
        }
        setTimeout(() => this.crawl(), BATCH_COOLDOWN);
      });
  }

  cancel() {
    this.shout('[CANCEL] Cancelling future matches');
    this.potentialMatches = [];
  }

  async seed() {
    this.log('Starting crawl...');

    const puuids = await getPuuids();

    if (!puuids || puuids.length === 0) {
      this.log('No summoners found, starting fresh');
      this.potentialMatches.push(FRESH_SEED);

      this.crawl();
      return;
    }

    const shuffled = puuids
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    Promise.all(shuffled.slice(0, 11).map((p) => this.addPotentialMatches(p)))
      .then(() => {
        this.log('Added matches from existing summoners');
        this.crawl();
      })
      .catch(this.error);
  }

  addPotentialMatches(puuid) {
    this.log(`Fetching match list for ${puuid}`);
    return this.riot.matchesFromPUUID(puuid).then((matches) => {
      this.log(`Fetched match list for ${puuid}`);

      const filtered = matches.filter(
        (id) =>
          !this.finishedMatches.includes(id) &&
          !this.potentialMatches.includes(id)
      );
      this.potentialMatches.push(...filtered);
    });
  }

  match(matchId) {
    if (this.finishedMatches.includes(matchId)) {
      this.log(`[${matchId}] Already processed match`);
      return null;
    }

    return this.riot
      .getMatchData(matchId)
      .then((match) => {
        this.log(`Fetched match ${matchId}`);

        return match;
      })
      .then((match) =>
        validateMatch(match, {
          tiers: ['EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'],
          patches: ['14.4', '14.5', '14.6'],
          crawler: this,
        }).catch((e) => {
          if (e instanceof MatchError) {
            this.shout(`[${matchId}] Discarding: ${e.message}`);
          } else {
            if (e instanceof NotFoundError) {
              throw new NotFoundError(e);
            }
            if (e instanceof RateLimitError) {
              throw new RateLimitError(e);
            }
            throw new Error(e);
          }
          return false;
        })
      )
      .then((match) => {
        if (match)
          return Promise.all([
            processMatch(match).then(
              this.shout(`[${matchId}] Processed match data`)
            ),
            this.timeline(matchId),
          ]);
        return true;
      })
      .catch((e) => {
        if (e instanceof NotFoundError) {
          this.error(`[${matchId}] Missing data, skipping`);
          return false;
        }
        if (e instanceof RateLimitError) {
          this.error(`[${matchId}] Rate limit exceeded`);
          throw new RateLimitError(e);
        }
        throw new Error(e);
      });
  }

  summoner(puuid) {
    return this.riot.getSummonerFromPUUID(puuid).then(async (summoner) => {
      this.log(`Fetched summoner ${puuid}`);

      const leagues = await this.riot.getLeagueFromId(summoner.id);

      const ranked = leagues.find((l) => l.queueType === 'RANKED_SOLO_5x5');

      return processSummoner(summoner, ranked?.tier).then((sum) => {
        this.log(`Processed summoner ${puuid}`);

        if (
          [
            'EMERALD',
            'DIAMOND',
            'MASTER',
            'GRANDMASTER',
            'CHALLENGER',
          ].includes(sum?.rankedTier)
        ) {
          this.addPotentialMatches(puuid);
        }

        return sum;
      });
    });
  }

  timeline(matchId) {
    return this.riot
      .getMatchTimeline(matchId)
      .then((timeline) => {
        this.log(`Fetched timeline for match ${matchId}`);

        return timeline;
      })
      .then((timeline) => processTimeline(timeline))
      .then(() => this.shout(`[${matchId}] Processed timeline data`));
  }
};
