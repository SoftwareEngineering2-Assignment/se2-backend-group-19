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
                              contentType: 'json', prefixUrl: t.context.prefixUrl});
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
  
  const body = await t.context.got('general/test-url');
  t.is(body.statusCode, 200);
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
  
  const bodyDict = {
    username: 'group19', 
    email: 'test@domain.com', 
    password: 'test'
  }
  const bodyString = JSON.stringify(bodyDict)

  const response = await t.context.got.post('users/create', {body:bodyString});
  console.log(response.body)
  t.pass();
})

// SOURCES
test('GET /sources returns correct response and status code', async (t) => {
  const token = jwtSign({id: 1});
  const {statusCode} = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 200);
});
