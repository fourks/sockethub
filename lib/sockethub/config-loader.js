/**
 * Function: ConfigLoader
 *
 * handles the actual require'ing of the config file and providing all the
 * default values for any missing fields, or params passed via. the command-line
 * at runtime.
 *
 * Parameters:
 *
 *   config  - can be a string (path to config file) or an object (data from an
 *                 existing loaded config file)
 *   secrets - can be a string (path to secrets file) or an object (data from an
 *                 existing loaded secrets file)
 *   cmdline - an object of params passed at the command-line
 *
 * Returns:
 *
 *   config object
 */
var path = require('path');
function ConfigLoader(param1, param2, cmdline) {
  var configFile, config, secretsFile, secrets;
  if (typeof param1 === 'string') {
    // param is path of config file to load
    configFile = param1;
  } else if (typeof param1 === 'object') {
    // param is object of config values
    config = param1;
  }

  if (typeof param2 === 'string') {
    // param is path of secrets file to load
    secretsFile = param2;
  } else if (typeof param2 === 'object') {
    // param is object of config values
    secrets = param2;
  }

  if (!cmdline) {
    cmdline = {};
  }

  //
  // first try to load the config from a file if string was passed
  if (configFile) {
    try {
      config = require(configFile).config;
    } catch (e1) {
      try {
         configFile = path.normalize('./../../' + configFile);
         config = require(configFile).config;
       } catch (e2) {
        try {
           configFile = path.normalize('./../../config.js.template');
           config = require(configFile).config;
        } catch (e3) {
          console.error(' [config] unable to load config: ' + configFile, e3);
          throw new Error('unable to load config: ' + configFile);
        }
      }
    }
    config.CONFIG_FILE = configFile;
  }

  //
  // first try to load the config from a file if string was passed
  if (secretsFile) {
    try {
      secrets = require(secretsFile);
    } catch (e1) {
      try {
        var secretsFile = path.normalize('./../../' + secretsFile);
        secrets = require(secretsFile);
      } catch (e2) {
        try {
        var secretsFile = path.normalize('./../../config.secrets.js.template');
          secrets = require(secretsFile);
        } catch (e3) {
          console.error(' [config] unable to load secrets file: ' + secretsFile, e3);
          throw new Error('unable to load secrets: ' + secretsFile);
        }
       }
    }
    config.SECRETS_FILE = secretsFile;
  }

  if ((typeof secrets === 'object') && (!config.SECRETS)) {
    config.SECRETS = secrets;
  }

  //
  // figure out repository base path, and examples location
  if (!config.BASE_PATH) {
    config.BASE_PATH = '';
  }
  //console.debug(' [config] require.main.filename - '+require.main.filename);
  if (require.main.filename.indexOf('bin\/sockethub') > 0) {
    config.BASE_PATH = '../../';
  }
  config.BASE_PATH = path.normalize(path.resolve(require.main.filename, config.BASE_PATH) + '/');
  //console.debug(' [config] base path: '+ config.BASE_PATH);


  //
  // get sockethub version
  var _p_path;
  var _p;
  try {
    _p_path = path.normalize(path.resolve('./', 'sockethub', 'package.json', './../../package.json'));
    _p = require(_p_path);
    config.SOCKETHUB_VERSION = _p.version;
  } catch (e) {
    // ignore error
    console.warn('unable to open '+_p_path, e);
  }

  //
  // apply any command-line args over existing config
  if (typeof cmdline === 'object') {
    // flags from command-line execution
    config.DEBUG = cmdline.debug || config.DEBUG || false;
    config.LOG_FILE = cmdline.log || config.LOG_FILE || false;
    config.VERBOSE = (cmdline.verbose) ? cmdline.verbose : (config.LOG_FILE) ? false : true;
  }
  //console.debug(' [config] debugging '+config.DEBUG);

  //
  // set defaults
  config.PLATFORMS = config.PLATFORMS || [];
  config.NUM_WORKERS = (typeof config.NUM_WORKERS === 'number') ? config.NUM_WORKERS : 1;
  if (config.PLATFORMS.length === 0) {
    console.error(' [config] no platforms defined in config, exiting', config);
    throw new Error('no platforms defined in config (PLATFORMS)');
  }

  if (!config.HOST) {
    config.HOST = {};
  }
  config.HOST.ENABLE_TLS = config.HOST.ENABLE_TLS || false;
  config.HOST.TLS_CERTS_DIR = config.HOST.TLS_CERTS_DIR || '';
  config.HOST.PORT = config.HOST.PORT || 10550;
  config.HOST.MY_PLATFORMS = config.HOST.MY_PLATFORMS || config.PLATFORMS;
  config.HOST.SETUID = config.HOST.SETUID || 99;

  if (!config.PUBLIC) {
    config.PUBLIC = {};
  }
  config.PUBLIC.DOMAIN = config.PUBLIC.DOMAIN || 'localhost';
  config.PUBLIC.PORT = config.PUBLIC.PORT || config.HOST.PORT;
  config.PUBLIC.WEBSOCKET_PATH = config.PUBLIC.WEBSOCKET_PATH || '/sockethub';
  config.PUBLIC.TLS = config.PUBLIC.TLS || config.HOST.ENABLE_TLS;
  config.PUBLIC.EXAMPLES_PATH = config.PUBLIC.EXAMPLES_PATH || '/examples';

  if (!config.REDIS) {
    config.REDIS = {};
  }
  config.REDIS.HOST = cmdline.redisHost || config.REDIS.HOST || '127.0.0.1';
  config.REDIS.PORT = cmdline.redisPort || config.REDIS.PORT || 6379;

  if (!config.EXAMPLES) {
    config.EXAMPLES = {};
  }
  config.EXAMPLES.ENABLE = config.EXAMPLES.ENABLE || false;
  config.EXAMPLES.SECRET = config.EXAMPLES.SECRET || '1234567890';
  config.EXAMPLES.DIRECTORY = config.EXAMPLES.DIRECTORY || 'examples';
  config.EXAMPLES.DIRECTORY = path.normalize(path.resolve(config.BASE_PATH, config.EXAMPLES.DIRECTORY));

  for (var i = 0, len = config.HOST.MY_PLATFORMS.length; i < len; i = i + 1) {
    if (config.HOST.MY_PLATFORMS[i] === 'dispatcher') {
      config.HOST.INIT_DISPATCHER = true;
    } else if ((config.NUM_WORKERS > 0) && (typeof config.HOST.INIT_LISTENER === 'undefined')) {
      config.HOST.INIT_LISTENER = true; // we are responsible for at least
                                        // one listener
    }
  }
  if (typeof config.HOST.INIT_LISTENER === 'undefined') {
    config.HOST.INIT_LISTENER = false;
  }

  config.SHOW_INFO = cmdline.info || false;





  config.printSummary = function () {
    console.log('Sockethub version ' + config.SOCKETHUB_VERSION);
    console.log('');
    console.log('         base dir:  ' + config.BASE_PATH);
    console.log('');
    console.log(' PLATFORMS');
    console.log('   worker threads:  ' + config.NUM_WORKERS);
    console.log('          enabled: ' + JSON.stringify(config.PLATFORMS));
    console.log('            local: ' + JSON.stringify(config.HOST.MY_PLATFORMS));
    console.log('');
    console.log(' HOST');
    var urn = config.PUBLIC.TLS ? 'https' : 'http';
    var base_url = urn + '://' + config.PUBLIC.DOMAIN + ':' + config.PUBLIC.PORT;
    console.log('    websocket url:  ' + base_url + config.PUBLIC.WEBSOCKET_PATH);
    var examples = (config.EXAMPLES.ENABLE) ? 'enabled' : 'disabled';
    if (examples) {
      console.log('');
      console.log('     examples dir:  ' + config.EXAMPLES.DIRECTORY);
      console.log('     examples url:  ' + base_url + config.PUBLIC.EXAMPLES_PATH);
    }

    console.log('');
    console.log('       redis host:  ' + config.REDIS.HOST + ':' + config.REDIS.PORT);
    console.log('');

  };

  return config;
}

var config;
module.exports = {
  get: function (p1, p2, c) {
    if (config) {
      return config;
    }
    p1 = (p1) ? p1 : './../../config.js.template';
    p2 = (p2) ? p2 : './../../config.secrets.js.template';
    config = ConfigLoader(p1, p2, c);
    return config;
  },
  clear: function () {
    config = undefined;
  }
};
