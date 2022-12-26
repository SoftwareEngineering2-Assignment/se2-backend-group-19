/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');

const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');

test.before(async (t) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
  t.context.got = got.extend({http2: true, throwHttpErrors: false, responseType: 'json', 
                              prefixUrl: t.context.prefixUrl});
});

test.after.always((t) => {
  t.context.server.close();
});

// GENERAL.JS
test('GET /statistics returns correct response and status code', async (t) => {
  const {body, statusCode} = await t.context.got('general/statistics');
  t.is(body.sources, 0);
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

// USERS
test('POST /create returns correct response and status code', async (t) => {
  
  const username = 'group30';
  const password = 'test123';
  const email = 'test30@domain.com';

  const body = await t.context.got.post('users/create', {
    json: {username, password, email}
  }).json();
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

test('POST /authenticate returns correct response and status code', async (t) => {
  
  const username = 'group20';
  const password = 'test123';

  const body = await t.context.got.post('users/authenticate', {
    json: {username, password}
  }).json();
  t.is(body.user.username, 'group20');
  t.is(body.user.id, '63a8e8245beede9f3c65b852')
})

test('POST /resetpassword returns correct response and status code', async (t) => {
  
  const username = 'group20';

  const body = await t.context.got.post('users/resetpassword', {
    json: {username}
  }).json();
  t.assert(body.ok);
})

test('POST /changepassword returns correct response and status code', async (t) => {
  
  const username = 'group29';
  const password = 'test123';
  const token = jwtSign({id: '63a8f02fbdb53fb7979924e1'});

  const body = await t.context.got.post(`users/changepassword?token=${token}`, {
    json: {username, password}
  }).json();
  console.log(body);
  t.is(body.status, 404)
})

// SOURCES
test('GET /sources returns correct response and status code', async (t) => {
  const token = jwtSign({id: 1});
  const {statusCode} = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 200);
});
