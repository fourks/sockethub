require("consoleplusplus/console++");
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(['require'], function(require) {
  var suites = [];

 suites.push({
    name: "Session failed init test",
    desc: "verify session will fail to init without enckey",
    setup: function(env, test) {
      test.result(true);
    },
    tests: [
      {
        desc: 'fail init without enckey',
        willFail: true,
        run: function (env, test) {
          env.sockethubId = '1234567890';
          env.Session = require('./../lib/sockethub/session')({sockethubId: env.sockethubId});
          test.result(true);
        }
      }
    ]
  });

  suites.push({
    name: "Session singleton tests",
    desc: "collection of tests for the Session singleton object",
    setup: function(env, test) {
      env.sockethubId = '1234567890';
      env.encKey = '5678abcd';
      GLOBAL.redis = require('./mocks/redis-mock')(test);
      env.sessionObj = {
        platform: 'test',
        sockethubId: env.sockethubId,
        encKey: env.encKey
      };
      env.Session = require('./../lib/sockethub/session')(env.sessionObj);
      console.log('SESSION: ', env.Session);
      test.result(true);
    },
    afterEach: function (env, test) {
      redis.__clearHandlers();
      delete GLOBAL.redis;
      test.result(true);
    },
    beforeEach: function (env, test) {
      GLOBAL.redis = require('./mocks/redis-mock')(test);
      test.assertType(redis.createClient, 'function');
    },
    takedown: function(env, test) {
      delete GLOBAL.redis;
      test.result(true);
    },
    tests: [
      {
        desc: "Session.get returns a new session object",
        run: function(env, test) {
          var session = env.Session.get('sid1');
          test.assertType(session, 'object');
        }
      },
      {
        desc: "Session.get with the same session ID returns the same object",
        run: function(env, test) {
          env.Session.get('sid1').then(function (session) {
            test.write('hello1');
            //console.log('session:', session);
            env.Session.get('sid1').then(function (sameSession) {
              test.write('hello2');
              //console.log('sameSession:', sameSession);
              test.assert(session.getSessionID(), sameSession.getSessionID());
            });
          });
        }
      },
      {
        desc: "Session.get with another session ID returns a different object",
        run: function(env, test) {
          env.Session.get('sid1').then(function (session1) {
            env.Session.get('sid2').then(function (session2) {
              //console.log('session1:', session1);
              //console.log('session2:', session2);
              test.assertFail(session1, session2);
            });
          });
        }
      },
      {
        desc: "Session.destroy removes a session",
        run: function(env, test) {
          var s1;
          env.Session.get('sid1').then(function (session) {
            s1 = session;
            return env.Session.destroy('sid1');
          }).then(function () {
            return env.Session.get('sid1', false);
          }).then(function (newSession) {
            test.result(false);
          }, function () {
            // session doesn't exist!
            test.result(true);
          });
        }
      },
      {
        desc: "Session.destroy doesn't affect sessions with a different ID",
        run: function(env, test) {
          var s2;
          env.Session.get('sid1').then(function (session) {
            return env.Session.get('sid2');
          }).then(function (session2) {
            s2 = session2;
            return env.Session.destroy('sid1');
          }).then(function () {
            return env.Session.get('sid2');
          }).then(function (sameSession2) {
            test.assert(s2, sameSession2);
          });
        }
      }
    ]
  });

  suites.push({
    name: "Session instance tests",
    desc: "collection of tests for the Session instance",
    setup: function(env, test) {
      env.sockethubId = '1234567890';
      env.encKey = '5678abcd';
      GLOBAL.redis = require('redis');//./mocks/redis-mock')(test);
      env.sessionObj = {
        platform: 'test',
        sockethubId: env.sockethubId,
        encKey: env.encKey
      };
      env.Session = require('./../lib/sockethub/session')(env.sessionObj);
      env.sid = 'test-sid';
      test.result(true);
    },
    beforeEach: function(env, test) {
      //GLOBAL.redis = require('./mocks/redis-mock')(test);
      test.assertTypeAnd(redis.createClient, 'function');
      env.Session.get(env.sid).then(function (session) {
        env.session = session;
        test.assertTypeAnd(env.session, 'object');
        test.assert(env.session.isRedisKeySet(), true);
      });
    },
    afterEach: function(env, test) {
      console.log('destroying session');
      env.Session.destroy(env.sid).then(function () {
        console.log('done destroying session');
        //redis.__clearHandlers();
        //delete GLOBAL.redis;
        test.result(true);
      }, function (e) {
        test.result(false, e);
      });
    },
    takedown: function(env, test) {
      //delete GLOBAL.redis;
      test.result(true);
    },
    tests: [
      {
        desc: "Session#register sets the session to registered",
        run: function(env, test) {
          env.session.register('1234567890');
          test.result(env.session.isRegistered());
        }
      },
      {
        desc: "Session#unregister sets the session to unregistered",
        run: function(env, test) {
          env.session.register('1234567890');
          test.assertAnd(env.session.isRegistered(), true);
          env.session.unregister();
          test.assert(env.session.isRegistered(), false);
        }
      },
      {
        desc: "Session#setConfig sets the settings",
        run: function(env, test) {
          env.session.setConfig('test', 'testkey', { foo: 'bar' }).then(function () {
            return env.session.getConfig('test', 'testkey');
          }).then(function (cfg) {
            test.assert(cfg, { foo: 'bar' });
          }, function (err) {
            console.log("ERR: ", err);
            test.result(false, err);
          });

        }
      },

      {
        desc: "Session#setConfig of complex objects using optional property param",
        run: function(env, test) {
          var t2 = { hello: 'world2', sub2: 'hithere', sub: { one: 'blah', five: 'yaya', three: { also: 'this also' }}};
          var t3 = { hello: 'world2', sub: { one: 'blah', two: 'blah', three: { well: 'this too', also: 'this also' }, five: 'yaya' }, sub2: 'hithere' };

          env.session.setConfig('test', 'test3', t3).then(function () {
            return env.session.setConfig('test', 'test2', t2);
          }).then(function () {
            return env.session.getConfig('test', 'test3');
          }).then(function (cfg) {
            test.assertAnd(cfg, t3);
            return env.session.getConfig('test', 'test2');
          }).then(function (cfg) {
            test.assert(cfg, t2);
          });
        }
      },

      {
        desc: "get platform instance",
        run: function (env, test) {
          var myConfig = {
            foo: 'bar',
            obj: {
              data: 'cat'
            },
            refrigerator: true
          };
          var psession;
          env.session.getPlatformSession('test').then(function (p) {
            psession = p;
            return psession.setConfig('testcfg', 'testkey', myConfig);
          }).then(function () {
            return psession.getConfig('testcfg', 'testkey');
          }).then(function (cfg) {
            test.assert(cfg, myConfig);
          }, function (err) {
            test.result(false, err);
          });
        }
      },

      {
        desc: "test for platform instance session id",
        run: function (env, test) {
          var psession;
          env.session.getPlatformSession('test').then(function (p) {
            psession = p;
            test.assertTypeAnd(psession.getSessionID, 'function', 'platform session does not return a getSessionID function');
            return psession.getSessionID();
          }).then(function (sid) {
            test.assert(sid, env.sid);
          }, function (err) {
            test.result(false, err);
          });
        }
      },

      {
        desc: "test for platform instance log functions",
        run: function (env, test) {
          var psession;
          env.session.getPlatformSession('test').then(function (p) {
            psession = p;
            test.assertTypeAnd(psession.log, 'function', 'platform session does not return a log function');
            test.assertTypeAnd(psession.info, 'function', 'platform session does not return a info function');
            test.assertTypeAnd(psession.error, 'function', 'platform session does not return a error function');
            test.assertTypeAnd(psession.debug, 'function', 'platform session does not return a debug function');
            test.assertType(psession.warn, 'function', 'platform session does not return a warn function');
          }, function (err) {
            test.result(false, err);
          });
        }
      },

      {
        desc: "Session#__cleanup clears platforms and settings",
        run: function(env, test) {
          test.assert(env.session.isRedisKeySet(), true);
          env.session.setConfig('yarg', 'testkey', { foo: 'bar' });
          //env.session.addPlatform('phu-quoc');
          env.session.__cleanup();
          //test.assert(env.session.getPlatforms(), []);
          env.session.getConfig('yarg', 'testkey').then(function (cfg) {
            test.assert(cfg, {});
            test.result(false);
          }, function (err) {
            test.result(true);
          });
        }
      },

      {
        desc: "Session#getFile returns a promise",
        run: function(env, test) {
          var promise = env.session.getFile('storage', 'foo/bar');
          console.log('-- PROMISE: ', promise);
          promise.then(function(d) {
            console.log('success: ',d);
          }, function(e) {
            console.log('failed: ',e);
          });
          test.assertTypeAnd(promise, 'object');
          test.assertType(promise.then, 'function');
        }
      },

      {
        desc: "Session#getFile fails when it has no remoteStorage config",
        run: function(env, test) {
          env.session.getFile('foo', 'bar').then(function () {
            test.result(false, "Expected Session#getFile to fail, but it succeeded");
          }, function () {
            test.result(true);
          });
        }
      }
    ]
  });


  suites.push({
    name: "Session getFile",
    desc: "Session interaction with remoteStorage",
    setup: function(env, test) {
      GLOBAL.redis = require('./mocks/redis-mock')(test);
      //delete GLOBAL.redis;
      //GLOBAL = {};
      env.sockethubId = '1234567890';
      env.encKey = '5678abcd';
      env.sessionObj = {
        platform: 'test',
        sockethubId: env.sockethubId,
        encKey: env.encKey
      };
      env.Session = require('./../lib/sockethub/session')(env.sessionObj);
      env.sid = 'test-sid';

      var http = require('http');
      env.testServer = http.createServer(function(req, res) {
        console.log("TEST SERVER INCOMING REQ: "+ req.url);

          env.captured.push(req);
          var r = env.simulateResponse;
          res.writeHead(r[0], r[1]);
          res.write(r[2]);
          res.end();
      });
      env.testServer.listen(12345, 'localhost', function() {
        console.log('test server listening on port 12345');
        test.result(true);
      });
    },
    takedown: function(env, test) {
      delete GLOBAL.redis;
      env.testServer.close(function() {
        test.result(true);
      });
    },
    beforeEach: function(env, test) {
      GLOBAL.redis = require('./mocks/redis-mock')(test);
      test.assertTypeAnd(redis.createClient, 'function');
      env.Session.get(env.sid).then(function (session) {
        env.session = session;
        env.session.setConfig('remoteStorage', 'default', {
          storageInfo: {
            href: 'http://localhost:12345/storage',
            type:"https://www.w3.org/community/rww/wiki/read-write-web-00#simple"
          },
          bearerToken: 'test-token',
          scope: {"":"rw"}
        });

        env.captured = [];
        env.simulateResponse = [200, { 'Content-Type': 'text/plain'}, 'Hello World'];

        test.result(true);
      }, function (err) {
        console.log("ERROR with Sesstion.get: ", err);
        test.result(false, err);
      });

    },
    afterEach: function(env, test) {
      redis.__clearHandlers();
      delete GLOBAL.redis;
      env.Session.destroy(env.sid);
      test.result(true);
    },
    tests: [
      {
        desc: "Session#getFile sends a request",
        run: function(env, test) {
          env.session.getFile('', 'foo/bar').
            then(function(source, result) {
              test.assert(env.captured.length, 1);
            }, function (err) {
              console.log("ERROR ", err);
              test.result(false, err);
            });
        }
      },
      {
        desc: "Session#getFile builds the path based on storage-root, module and path",
        run: function(env, test) {
          env.session.getFile('', 'foo/bar').
            then(function() {
              var req = env.captured[0];
              test.assert(req.url, '/storage/foo/bar');
            });
        }
      },
      {
        desc: "Session#getFile sets the Authorization header correctly",
        run: function(env, test) {
          env.session.getFile('', 'phu/quoc').
            then(function() {
              var req = env.captured[0];
              test.assert(req.headers['authorization'], 'Bearer test-token');
            });
        }
      },
      {
        desc: "Session#getFile yields the response body and MIME type",
        run: function(env, test) {
          env.session.getFile('', 'foo/bar').
            then(function(e) {
              test.assertAnd(e[1].mimeType, 'text/plain');
              test.assert(e[1].data, 'Hello World');
            }).fail(function (e) {
              console.error('test failed: ' + e);
            });
        }
      },
      {
        desc: "Session#getFile unpacks JSON data",
        run: function(env, test) {
          env.simulateResponse = [200, { 'Content-Type': 'application/json' },
                                  '{"phu":"quoc"}'];
          env.session.getFile('', 'foo/baz').
            then(function(e) {
              test.assert(e[1], { phu: 'quoc' });
            });
        }
      }
    ]
  });



  /**
   * SESSION PINGS & ENCKEY
   **/
  suites.push({
    desc: "Session communication",
    setup: function (env, test) {
      GLOBAL.redis = require('./mocks/redis-mock')(test);
      //GLOBAL.redis = require('redis');
      env.sockethubId = '1234567890';
      env.encKey = '5678abcd';
      env.sid = 'test-sid';
      env.sessionObj = {
        platform: 'test',
        sockethubId: env.sockethubId,
        encKey: env.encKey
      };

      test.assertTypeAnd(redis.createClient, 'function');

      env.dispatcher = require('./../lib/sockethub/session')({
        platform: 'dispatcher',
        sockethubId: env.sockethubId,
        encKey: env.encKey
      });
      test.assertTypeAnd(env.dispatcher.destroy, 'function');
      test.assertAnd(env.dispatcher.encKeySet(), true);

      env.p_one = require('./../lib/sockethub/session')({
        platform: 'p_one',
        sockethubId: env.sockethubId,
        encKey: false
      });
      test.assertTypeAnd(env.p_one.destroy, 'function');
      test.assertAnd(env.p_one.encKeySet(), false);

      env.p_two = require('./../lib/sockethub/session')({
        platform: 'p_two',
        sockethubId: env.sockethubId,
        encKey: false
      });

      test.assertType(env.p_two.destroy, 'function');
    },
    takedown: function(env, test) {
      test.result(true);
    },
    beforeEach: function(env, test) {
      test.assert(env.p_two.encKeySet(), false, 'enc key should be clear!');
    },
    afterEach: function(env, test) {
      //env.p_two.subsystem.cleanup();
      //env.p_one.subsystem.cleanup();
      //env.dispatcher.subsystem.cleanup();
      //env.dispatcher.destroy();
      //env.p_two.destroy();
      //env.p_one.destroy();
      env.p_one.clearEncKey();
      env.p_two.clearEncKey();
      env.p_one.subsystem.events.removeAllListeners();
      env.p_two.subsystem.events.removeAllListeners();
      env.p_one.setListeners();
      env.p_two.setListeners();
      test.result(true);
    },
    tests: [
      {
        desc: "dispatcher pings first",
        timeout: 15000,
        run: function (env, test) {
          var p_resp = {};
          env.dispatcher.subsystem.events.on('ping-response', function (data) {
            p_resp[data.actor.platform] = true;
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.assertAnd(env.p_one.encKeySet(), true);
              test.assert(env.p_two.encKeySet(), true);
            }
          });
          env.dispatcher.subsystem.send('ping', {timestamp: new Date().getTime(), encKey: env.encKey});
        }
      },
      {
        desc: "platforms ping first",
        timeout: 15000,
        run: function (env, test) {
          var p_resp = {};
          env.p_one.subsystem.events.on('ping-response', function (data) {
            p_resp['p_one'] = true;
            //console.log('p_one - recieved data: ['+env.p_one.encKeySet()+'] ', data);
            test.assertAnd(data.object.encKey, env.encKey);
            test.assertAnd(env.p_one.encKeySet(), true, 'p_one - enckey not set on ping-response');
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          });
          env.p_two.subsystem.events.on('ping-response', function (data) {
            p_resp['p_two'] = true;
            test.assertAnd(data.object.encKey, env.encKey);
            test.assertAnd(env.p_two.encKeySet(), true, 'p_two - enckey not set on ping-response');
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          });
          env.p_one.subsystem.send('ping', {requestEncKey: true, timestamp: new Date().getTime()}, 'dispatcher');
          env.p_two.subsystem.send('ping', {requestEncKey: true, timestamp: new Date().getTime()}, 'dispatcher');
        }
      },

      {
        desc: "receive cleanup 1",
        run: function (env, test) {
          var p_resp = {};
          env.p_one.subsystem.events.on('cleanup', function (data) {
            p_resp['p_one'] = true;
            //console.log('p_one received cleanup: ', data);
            test.assertTypeAnd(data.object.sids, 'object');
            test.assertAnd(data.object.sids[2], '12345', 'sid[2] not set on cleanup');
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          });
          env.p_two.subsystem.events.on('cleanup', function (data) {
            p_resp['p_two'] = true;
            //console.log('p_two received cleanup: ', data);
            test.assertTypeAnd(data.object.sids, 'object');
            test.assertAnd(data.object.sids[2], '12345', 'sid[2] not set on cleanup');
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          });
          console.log('dispatcher sending cleanup command');
          env.dispatcher.subsystem.send('cleanup', {sids: ['0921','82712','12345','abcd2']});
        }
      },

      {
        desc: "receive cleanup 2",
        run: function (env, test) {
          var p_resp = {};
          env.p_one.subsystem.events.on('cleanup', function (data) {
            p_resp['p_one'] = true;
            //console.log('p_one received cleanup: ', data);
            test.assertTypeAnd(data.object.sids, 'object');
            test.assertAnd(data.object.sids[2], '12345', 'sid[2] not set on cleanup');
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          });
          env.p_two.subsystem.events.on('cleanup', function (data) {
            p_resp['p_two'] = true;
            //console.log('p_two received cleanup: ', data);
            test.assertTypeAnd(data.object.sids, 'object');
            test.assertAnd(data.object.sids[2], '12345', 'sid[2] not set on cleanup');
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          });
          console.log('dispatcher sending cleanup command');
          env.dispatcher.subsystem.send('cleanup', {sids: ['0921','82712','12345','abcd2']});
        }
      },

      {
        desc: "receive cleanup 3",
        run: function (env, test) {
          var p_resp = {};
          env.p_one.subsystem.events.on('cleanup', function (sid) {
            p_resp['p_one'] = true;
          });
          env.p_two.subsystem.events.on('cleanup', function (sid) {
            p_resp['p_two'] = true;
          });
          console.log('dispatcher sending cleanup command');
          env.dispatcher.subsystem.send('cleanup', {sids: ['0921']});
          setTimeout(function () {
            if ((p_resp['p_one']) && (p_resp['p_two'])) {
              test.result(true);
            }
          }, 1000);
        }
      },

      {
        desc: "cleanup actual session",
        run: function (env, test) {
          var p_resp = {};
          console.log('dispatcher sending cleanup command');
          env.p_one.events.on('cleanup', function (sid) {
            p_resp['p_one'] = true;
          });
          env.p_one.subsystem.send('ping', {requestEncKey: true, timestamp: new Date().getTime()}, 'dispatcher');
          setTimeout(function () {
            env.p_one.get('0921').then(function (session) {
              env.dispatcher.subsystem.send('cleanup', {sids: ['0921']});
              setTimeout(function () {
                var c = redis.createClient();
                if (!c.exists('sockethub:'+env.sockethubId+':session:0921:_internal')) {
                  test.result(true);
                }
              }, 1000);
            });
          }, 1000);
        }
      }
    ]
  });
  return suites;
});

