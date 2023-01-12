/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');

const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');
const errorMiddleware = require('../src/middlewares/error');
const authorizationMiddleware = require('../src/middlewares/authorization');
const { none } = require('ramda');

test.before(async (t) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
  t.context.got = got.extend({http2: true, throwHttpErrors: false, responseType: 'json', 
                              prefixUrl: t.context.prefixUrl});
});

test.after.always((t) => {
  t.context.server.close();
});

// ===================  GENERAL.JS  ======================
test('GET /statistics returns correct response and status code', async (t) => {
  const {body, statusCode} = await t.context.got('general/statistics');
  // t.is(body.sources, 0);
  t.assert(body.success);
  t.is(statusCode, 200);
});

test('GET /test-url returns correct response and status code', async (t) => {
  const test_url = "https://se2-frontend.netlify.app/";
  const body = await t.context.got(`general/test-url?url=${test_url}`);
  t.is(body.statusCode, 200);
  // t.assert(body.active);
});

test('GET /test-url-request returns correct response and status code', async (t) => {
  const bodyGet = await t.context.got('general/test-url-request?type=GET');
  t.is(bodyGet.statusCode, 200);

  const bodyPost = await t.context.got('general/test-url-request?type=POST');
  t.is(bodyPost.statusCode, 200);

  const bodyPut = await t.context.got('general/test-url-request?type=PUT');
  t.is(bodyPut.statusCode, 200);
});

// ===================  USERS.JS  ======================
test('POST /create returns correct response for new registration', async (t) => {
  
  const timestamp = Date.now();
  const username = 'group' + timestamp.toString();
  const password = 'test123';
  const email = 'test' + timestamp.toString() + '@domain.com';

  const body = await t.context.got.post('users/create', {
    json: {username, password, email}
  }).json();
  console.log(body)
  t.assert(body.success);
});

test('POST /create returns correct response for used email', async (t) => {
  
  const username = 'group22';
  const password = 'test123';
  const email = 'test21@domain.com';

  const body = await t.context.got.post('users/create', {
    json: {username, password, email}
  }).json();
  t.is(body.status, 409);
});

test('POST /authenticate returns correct response for corrent username and password', async (t) => {
  
  const username = 'group20';
  const password = 'test123';

  const body = await t.context.got.post('users/authenticate', {
    json: {username, password}
  }).json();
  t.is(body.user.username, 'group20');
  t.is(body.user.id, '63a8e8245beede9f3c65b852')
})

test('POST /authenticate returns correct response for incorrent username', async (t) => {
  
  const username = 'group0';
  const password = 'test123';

  const body = await t.context.got.post('users/authenticate', {
    json: {username, password}
  }).json();
  t.is(body.status, 401);
})

test('POST /authenticate returns correct response for incorrent password', async (t) => {
  
  const username = 'group20';
  const password = 'test321';

  const body = await t.context.got.post('users/authenticate', {
    json: {username, password}
  }).json();
  t.is(body.status, 401);
})

test('POST /resetpassword returns correct response for correct username', async (t) => {
  
  const username = 'group20';

  const body = await t.context.got.post('users/resetpassword', {
    json: {username}
  }).json();
  t.assert(body.ok);
})

test('POST /resetpassword returns correct response for incorrect username', async (t) => {
  
  const username = 'group0';

  const body = await t.context.got.post('users/resetpassword', {
    json: {username}
  }).json();
  t.is(body.status, 404);
})

test('POST /changepassword returns correct response for expired token', async (t) => {
  
  const username = 'group1672069371563';
  const password = 'test123';
  const token = jwtSign({username});

  const body = await t.context.got.post(`users/changepassword?token=${token}`, {
    json: {username, password}
  }).json();
  t.is(body.status, 410)
})

test('POST /changepassword returns correct response for incorrect user', async (t) => {
  
  const username = 'group0';
  const password = 'test123';
  const token = jwtSign({username});

  const body = await t.context.got.post(`users/changepassword?token=${token}`, {
    json: {username, password}
  }).json();
  t.is(body.status, 404)
})

// ===================  VALIDATION.JS  ======================
test('POST /validation returns correct response for small password', async (t) => {
  
  const {validation} = require('../src/middlewares');

  const username = 'group22';
  const password = 'test';

  const mockReq = {
    body: {username, password}
  };
  const mockRes = {};
  const next = (err) => {
    t.is(err.message, 'Validation Error: password must be at least 5 characters');
    t.is(err.status, 400);
  };

  await validation(mockReq, mockRes, next, 'register');
});

// ===================  SOURCES.JS  ======================
test('GET /sources returns correct response and status code', async (t) => {
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const {statusCode} = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 200);
});

test('POST /create-source returns correct response for new source', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const timestamp = Date.now();
  const name = 'SourceName' + timestamp.toString();
  const type = 'SourceType';
  const url = 'http://localhost:8888/'
  const login = 'SourceLogin'
  const passcode = 'SourcePass'
  const vhost = 'SourceVhost'

  const body = await t.context.got.post(`sources/create-source?token=${token}`, {
    json: {name, type, url, login, passcode, vhost}
  }).json();
  t.assert(body.success)
})

test('POST /create-source returns correct response for already existed source', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const name = 'SourceName1672182878472';
  const type = 'SourceType';
  const url = 'http://localhost:8888/'
  const login = 'SourceLogin'
  const passcode = 'SourcePass'
  const vhost = 'SourceVhost'

  const body = await t.context.got.post(`sources/create-source?token=${token}`, {
    json: {name, type, url, login, passcode, vhost}
  }).json();
  t.is(body.status, 409)
})

test('POST /change-source returns correct response for non-existed source', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = 1111111;
  const name = 'SourceName1672183697135';
  const type = 'SourceType';
  const url = 'http://localhost:8888/'
  const login = 'SourceLogin'
  const passcode = 'SourcePass'
  const vhost = 'SourceVhost'

  const body = await t.context.got.post(`sources/change-source?token=${token}`, {
    json: {id, name, type, url, login, passcode, vhost}
  }).json();
  t.is(body.status, 409)
})

test('POST /change-source returns correct response for same-name sources', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = 2362846;
  const name = 'SourceName1672183697135';
  const type = 'SourceType';
  const url = 'http://localhost:8888/'
  const login = 'SourceLogin'
  const passcode = 'SourcePass'
  const vhost = 'SourceVhost'

  const body = await t.context.got.post(`sources/change-source?token=${token}`, {
    json: {id, name, type, url, login, passcode, vhost}
  }).json();
  t.is(body.status, 409)
})

// test('POST /change-source returns correct response when everything is fine', async (t) => {
  
//   const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
//   const id = '2362846';
//   const name = 'SourceNameChanged';
//   const type = 'SourceType';
//   const url = 'http://localhost:8888/'
//   const login = 'SourceLogin'
//   const passcode = 'SourcePass'
//   const vhost = 'SourceVhost'

//   const body = await t.context.got.post(`sources/change-source?token=${token}`, {
//     json: {id, name, type, url, login, passcode, vhost}
//   }).json();
//   console.log(body)
//   t.pass()
// })

// ===================  ERROR.JS  ======================
test('error middleware', (t) => {
  const req = {};
  const res = {
    status: (status) => {
      t.is(status, 500);
      return res;
    },
    json: (error) => {
      t.is(error.message, 'An error occurred');
      t.is(error.status, 500);
    },
  };
  const next = () => {};
  errorMiddleware(new Error('An error occurred'), req, res, next);
});

test('error middleware with status code', (t) => {
  const req = {};
  const res = {
    status: (status) => {
      t.is(status, 400);
      return res;
    },
    json: (error) => {
      t.is(error.message, 'Bad request');
      t.is(error.status, 400);
    },
  };
  const next = () => {};
  errorMiddleware({ message: 'Bad request', status: 400 }, req, res, next);
});

// ===================  AUTHORIZATION.JS  ======================
test('authorization middleware with valid token in query string', (t) => {
  const valid_token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const req = {
    query: {
      token: valid_token,
    },
  };
  const res = {};
  const next = (error) => {
    t.is(error, undefined);
  };
  authorizationMiddleware(req, res, next);
});

test('authorization middleware with valid token in headers', (t) => {
  const valid_token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const req = {
    headers: {
      'x-access-token': valid_token,
    },
  };
  const res = {};
  const next = (error) => {
    t.is(error, undefined);
  };
  authorizationMiddleware(req, res, next);
});

test('authorization middleware with invalid token in query string', (t) => {
  const req = {
    query: {
      token: 'invalid-token',
    },
  };
  const res = {};
  const next = (error) => {
    t.is(error.message, 'Authorization Error: Failed to verify token.');
    t.is(error.status, 403);
  };
  authorizationMiddleware(req, res, next);
});

test('authorization middleware with no token', (t) => {
  const req = {};
  const res = {};
  const next = (error) => {
    t.is(error.message, 'Authorization Error: token missing.');
    t.is(error.status, 403);
  };
  authorizationMiddleware(req, res, next);
});

// ===================  DASHBOARDS.JS  ======================
const last_dashboard = {
  id: '63c02b4930fcf6d16ff7b7dd', // Change this ID to delete something that actually exists!
};

test('GET /dashboards returns correct response and status code', async (t) => {
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const {body} = await t.context.got(`dashboards/dashboards?token=${token}`);
  console.log('--> Dashboards: ', body.dashboards)
  last_dashboard.id = body.dashboards[body.dashboards.length - 1].id
  t.assert(body.success);
});

test('GET /dashboard returns correct response for non-existed dashboard', async (t) => {
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = '63b580555b4d29e60995c000'

  const {body} = await t.context.got(`dashboards/dashboard?token=${token}&id=${id}`);
  t.is(body.status, 409);
});

test('GET /dashboard returns correct response for existed dashboard', async (t) => {
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = '63b573a00723c8c453695bc7';

  const {body} = await t.context.got(`dashboards/dashboard?token=${token}&id=${id}`);
  t.assert(body.success);
});

test('POST /create-dashboard returns correct response for new dashbooard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const timestamp = Date.now();
  const name = 'Dashboard_' + timestamp.toString();

  const body = await t.context.got.post(`dashboards/create-dashboard?token=${token}`, {
    json: {name}
  }).json();

  t.assert(body.success);
});

test('POST /create-dashboard returns correct response for existed dashbooard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const name = 'Dashboard_1672835998849';

  const body = await t.context.got.post(`dashboards/create-dashboard?token=${token}`, {
    json: {name}
  }).json();
  t.is(body.status, 409);
});

test('POST /delete-dashboard returns correct response for existed dashbooard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = last_dashboard.id;

  const body = await t.context.got.post(`dashboards/delete-dashboard?token=${token}`, {
    json: {id}
  }).json();
  t.assert(body.success);
});

test('POST /delete-dashboard returns correct response for non-existed dashbooard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = -1;

  const body = await t.context.got.post(`dashboards/delete-dashboard?token=${token}`, {
    json: {id}
  }).json();
  t.is(body.status, 409);
});

test('POST /save-dashboard returns correct response for non-existed dashbooard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = -1;
  const layout = [];
  const items = {};
  const nextId = 1;

  const body = await t.context.got.post(`dashboards/save-dashboard?token=${token}`, {
    json: {id, layout, items, nextId}
  }).json();
  t.is(body.status, 409);
});

test('POST /save-dashboard returns correct response for existed dashbooard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const id = '63b573a00723c8c453695bc7';
  const layout = [];
  const items = {};
  const nextId = 1;

  const body = await t.context.got.post(`dashboards/save-dashboard?token=${token}`, {
    json: {id, layout, items, nextId}
  }).json();
  t.assert(body.success);
});

test('POST /clone-dashboard returns correct response for existed dashbooard and new name', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const dashboardId = '63b573a00723c8c453695bc7'; // correct ID
  const timestamp = Date.now();
  const name = 'Dashboard_' + timestamp.toString();

  const body = await t.context.got.post(`dashboards/clone-dashboard?token=${token}`, {
    json: {dashboardId, name}
  }).json();
  t.assert(body.success);
});

test('POST /clone-dashboard returns correct response for existed name', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const dashboardId = '63b5719c913051bf3178da66'; // wrond ID
  const name = 'Dashboard_1672835998849';

  const body = await t.context.got.post(`dashboards/clone-dashboard?token=${token}`, {
    json: {dashboardId, name}
  }).json();
  t.is(body.status, 409);
});

test('POST /check-password-needed returns correct response for non-existed dashboard', async (t) => {
  
  const user = {'id': '63a8e8245beede9f3c65b852'}
  const dashboardId = '63b5719c913051bf3178da66'; // wrond ID

  const body = await t.context.got.post(`dashboards/check-password-needed`, {
    json: {user, dashboardId}
  }).json();
  t.is(body.status, 409);
});

test('POST /check-password-needed returns correct response for existed dashboard', async (t) => {
  
  const user = {'id': '63a8e8245beede9f3c65b852'}
  const dashboardId = '63b573a00723c8c453695bc7'; // correct ID

  const body = await t.context.got.post(`dashboards/check-password-needed`, {
    json: {user, dashboardId}
  }).json();
  t.assert(body.success);
  t.is(body.owner, 'self')
});

test('POST /check-password returns correct response for non-existed dashboard', async (t) => {
  
  const password = null;
  const dashboardId = '63b5719c913051bf3178da66'; // wrond ID

  const body = await t.context.got.post(`dashboards/check-password`, {
    json: {dashboardId, password}
  }).json();
  t.is(body.status, 409);
});

test('POST /check-password returns correct response for existed dashboard with no password', async (t) => {
  
  const password = 'password';
  const dashboardId = '63b573a00723c8c453695bc7'; // correct ID

  const body = await t.context.got.post(`dashboards/check-password`, {
    json: {dashboardId, password}
  }).json();
  t.assert(body.success)
  t.assert(body.correctPassword)
});

test('POST /change-password returns correct response for existed dashboard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const password = 'password';
  const dashboardId = '63b573a00723c8c453695bc7'; // correct ID

  const body = await t.context.got.post(`dashboards/change-password?token=${token}`, {
    json: {dashboardId, password}
  }).json();
  t.assert(body.success)
});

test('POST /change-password returns correct response for non-existed dashboard', async (t) => {
  
  const token = jwtSign({id: '63a8e8245beede9f3c65b852'});
  const password = 'password';
  const dashboardId = '63b573a00723c8c453695b77'; // wrong ID

  const body = await t.context.got.post(`dashboards/change-password?token=${token}`, {
    json: {dashboardId, password}
  }).json();
  t.is(body.status, 409)
});