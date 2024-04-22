/* eslint-disable */
// old ass file
const axios = require('axios').default;
require('dotenv').config();

const RIOT_NA_BASE_URL = 'https://na1.api.riotgames.com';
const RIOT_API_BASE_URL = 'https://americas.api.riotgames.com';

class NotFoundError extends Error {
  constructor(...args) {
    super(...args);

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

class RateLimitError extends Error {
  constructor(...args) {
    super(...args);

    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

class RiotHTTPClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.config = {
      headers: {
        'X-Riot-Token': this.apiKey,
      },
    };
  }

  get(path) {
    return this.handleRequest(
      axios.get(this.route(path, true), { ...this.config })
    );
  }

  getNA(path) {
    return this.handleRequest(
      axios.get(this.route(path, false), { ...this.config })
    );
  }

  route(path, americas) {
    let result = null;
    if (americas) {
      result = new URL(RIOT_API_BASE_URL);
    } else {
      result = new URL(RIOT_NA_BASE_URL);
    }

    // Safer to use path as the validated 'setter', so that the path is not
    // directly to the base URL. That could lead to injection to change
    // the host, port, path, and query params, of the URL.
    result.pathname = path;

    return result.toString();
  }

  handleRequest(request) {
    return request.catch((e) => {
      if (e.response) {
        if (e.response?.status === 404) {
          throw new NotFoundError(e);
        } else if (e.response?.status === 429) {
          throw new RateLimitError(e);
        }
      } else if (e.request) {
        if (e.request?.status === 404) {
          throw new NotFoundError(e);
        } else if (e.request?.status === 429) {
          throw new RateLimitError(e);
        }
      }
      throw new Error(e);
    });
  }
}

class RiotClient {
  constructor(apiKey) {
    apiKey ??= process.env.RIOTAPI;

    if (!apiKey) {
      throw new TypeError('"apiKey" could not be resolved');
    }

    this.httpClient = new RiotHTTPClient(apiKey);
  }

  getSummonerFromPUUID(puuid) {
    return this.httpClient
      .getNA(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)
      .then((res) => {
        if (!res) {
          return null;
        }
        return res.data;
      });
  }

  getLeagueFromId(summonerId) {
    return this.httpClient
      .getNA(`/lol/league/v4/entries/by-summoner/${summonerId}`)
      .then((res) => {
        if (!res) {
          return null;
        }
        return res.data;
      });
  }

  matchesFromPUUID(puuid) {
    return this.httpClient
      .get(`/lol/match/v5/matches/by-puuid/${puuid}/ids`)
      .then((res) => {
        if (!res) {
          return null;
        }
        return res.data;
      });
  }

  getMatchData(matchId) {
    return this.httpClient
      .get(`/lol/match/v5/matches/${matchId}`)
      .then((res) => res.data);
  }

  getMatchTimeline(matchId) {
    return this.httpClient
      .get(`/lol/match/v5/matches/${matchId}/timeline`)
      .then((res) => res.data);
  }
}

module.exports = {
  RiotClient,
  NotFoundError,
  RateLimitError,
};
