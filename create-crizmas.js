#!/usr/bin/env node

'use strict';

const {writeFileSync, mkdirSync} = require('fs');
const {join, basename} = require('path');

const flagTypes = {
  all: 'all',
  router: 'router',
  form: 'form',
  components: 'components',
  jsx: 'jsx',
  githubApp: 'githubApp',
  help: 'help'
};

const optionsMap = new Map([
  [flagTypes.all, ['-A', '--all']],
  [flagTypes.router, ['-R', '--router']],
  [flagTypes.form, ['-F', '--form']],
  [flagTypes.components, ['-C', '--components']],
  [flagTypes.jsx, ['-JSX', '--jsx']],
  [flagTypes.githubApp, ['-GA', '--github-app']],
  [flagTypes.help, ['-H', '--help']]
]);

const knownOptions = new Set([...optionsMap.values()].flat());

const packagesDependencies = new Map([
  [
    'crizmas-mvc',
    [
      'crizmas-utils',
      'react',
      'react-dom'
    ]
  ],
  [
    'crizmas-router',
    [
      'crizmas-mvc',
      'crizmas-utils',
      'crizmas-async-utils',
      'react',
      'prop-types'
    ]
  ],
  [
    'crizmas-async-utils',
    [
      'crizmas-utils'
    ]
  ],
  [
    'crizmas-form',
    [
      'crizmas-mvc',
      'crizmas-utils',
      'crizmas-async-utils',
      'crizmas-promise-queue'
    ]
  ],
  [
    'crizmas-components',
    [
      'crizmas-mvc',
      'crizmas-utils',
      'smart-mix',
      'react',
      'prop-types'
    ]
  ]
]);

const commonDependencies = [
  'clean-webpack-plugin',
  'copy-webpack-plugin',
  'cross-env',
  'html-webpack-plugin',
  'webpack',
  'webpack-cli',
  'webpack-dev-server'
];

const jsxDependencies = [
  '@babel/core',
  '@babel/preset-react',
  'babel-loader'
];

const versions = new Map([
  ['@babel/core', '^7.11.6'],
  ['@babel/preset-react', '^7.10.4'],
  ['babel-loader', '^8.1.0'],
  ['clean-webpack-plugin', '^3.0.0'],
  ['copy-webpack-plugin', '^6.1.1'],
  ['crizmas-async-utils', '^1.1.0'],
  ['crizmas-components', '^1.5.2'],
  ['crizmas-form', '^1.1.1'],
  ['crizmas-mvc', '^1.1.0'],
  ['crizmas-promise-queue', '^1.0.2'],
  ['crizmas-router', '^1.2.0'],
  ['crizmas-utils', '^1.0.3'],
  ['cross-env', '^7.0.2'],
  ['html-webpack-plugin', '^4.5.0'],
  ['prop-types', '^15.7.2'],
  ['react', '^16.13.1'],
  ['react-dom', '^16.13.1'],
  ['smart-mix', '^1.1.0'],
  ['webpack', '^4.44.2'],
  ['webpack-cli', '^3.3.12'],
  ['webpack-dev-server', '^3.11.0']
]);

const passedOptions = new Set(process.argv.slice(2));
const currentWorkingDirectory = process.cwd();
const dirname = basename(currentWorkingDirectory);

const main = () => {
  if (checkUnknownOptions()) {
    return;
  }

  if (checkHelpOption()) {
    return;
  }

  createPackageJson();
  createWebpackConfig();
  createSrc();
};

const isFlagActive = (flagType) => {
  return optionsMap.get(flagType).some((option) => {
    return passedOptions.has(option);
  });
};

const checkUnknownOptions = () => {
  let foundUnknownOption = false;

  passedOptions.forEach((option) => {
    if (!knownOptions.has(option)) {
      foundUnknownOption = true;

      console.error('Unknown option:', option);
    }
  });

  if (foundUnknownOption) {
    console.log('Run create-crizmas --help to see how to use the command.');
  }

  return foundUnknownOption;
};

const checkHelpOption = () => {
  if (hasHelpOption()) {
    console.log('create-crizmas [options separated by space]');
    console.log('Options:');
    console.log('-R or --router');
    console.log('      - adds crizmas-router and its dependencies;');
    console.log('-F or --form');
    console.log('      - adds crizmas-form and its dependencies;');
    console.log('-C or --components');
    console.log('      - adds crizmas-components and its dependencies;');
    console.log('-JSX or --jsx');
    console.log('      - adds jsx support;');
    console.log('-A or --all');
    console.log('      - equivalent to -R -F -C -JSX;');
    console.log('-GA or --github-app');
    console.log('      - adds support for deploying as a github page;');
    console.log('-H or --help');
    console.log('      - displays helpful information about the command.');

    return true;
  }
};

const hasHelpOption = () => {
  return isFlagActive(flagTypes.help);
};

const hasAllOption = () => {
  return isFlagActive(flagTypes.all);
};

const hasRouterOption = () => {
  return hasAllOption() || isFlagActive(flagTypes.router);
};

const hasFormOption = () => {
  return hasAllOption() || isFlagActive(flagTypes.form);
};

const hasComponentsOption = () => {
  return hasAllOption() || isFlagActive(flagTypes.components);
};

const hasJsxOption = () => {
  return hasAllOption() || isFlagActive(flagTypes.jsx);
};

const hasGithubAppOption = () => {
  return isFlagActive(flagTypes.githubApp);
};

const createPackageJson = () => {
  const dependenciesSet = new Set();

  addCommonDependencies(dependenciesSet);
  addPackageToDependencies(dependenciesSet, 'crizmas-mvc');

  if (hasRouterOption()) {
    addPackageToDependencies(dependenciesSet, 'crizmas-router');
  }

  if (hasFormOption()) {
    addPackageToDependencies(dependenciesSet, 'crizmas-form');
  }

  if (hasComponentsOption()) {
    addPackageToDependencies(dependenciesSet, 'crizmas-components');
  }

  if (hasJsxOption()) {
    addJsxDepedencies(dependenciesSet);
  }

  const packageJson = {
    name: dirname,
    private: true,
    scripts: {
      start: 'cross-env NODE_ENV=development webpack-dev-server',
      build: 'cross-env NODE_ENV=production webpack'
    },
    dependencies: Object.fromEntries([...dependenciesSet].sort().map((dependency) => {
      return [dependency, versions.get(dependency)];
    }))
  };

  writeFileSync(
    join(currentWorkingDirectory, 'package.json'),
    JSON.stringify(packageJson, null, 2));
};

const addCommonDependencies = (dependenciesSet) => {
  commonDependencies.forEach((dependency) => {
    dependenciesSet.add(dependency);
  });
};

const addPackageToDependencies = (dependenciesSet, dependency) => {
  dependenciesSet.add(dependency);

  const dependencies = packagesDependencies.get(dependency);

  if (dependencies) {
    dependencies.forEach((dependency) => {
      addPackageToDependencies(dependenciesSet, dependency);
    });
  }
};

const addJsxDepedencies = (dependenciesSet) => {
  jsxDependencies.forEach((dependency) => {
    dependenciesSet.add(dependency);
  });
};

const createWebpackConfig = () => {
  const webpackContents = `
    'use strict';

    const path = require('path');
    const webpack = require('webpack');
    const HtmlWebpackPlugin = require('html-webpack-plugin');
    const {CleanWebpackPlugin} = require('clean-webpack-plugin');
    const CopyWebpackPlugin = require('copy-webpack-plugin');

    const DefinePlugin = webpack.DefinePlugin;
    const mode = process.env.NODE_ENV;
    const basePath = ${hasGithubAppOption() ? `'${dirname}'` : `null`};
    const isProductionTest = false;
    const isProduction = mode === 'production' && !isProductionTest;
    const hasProductionBasePath = isProduction && !!basePath;

    module.exports = {
      mode,
      devtool: 'source-map',
      entry: './src/js/main.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: hasProductionBasePath ? \`/\${basePath}/\` : '/',
        filename: '[name].bundle-[hash].js'
      },
      resolve: {
        extensions: ${hasJsxOption() ? `['.js', '.jsx']` : `['.js']`}
      },
      ${hasJsxOption() ? `module: {
        rules: [
          {
            test: /\.jsx?$/,
            // normalization needed for windows
            include: path.normalize(\`\${__dirname}/src\`),
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/react']
                }
              }
            ]
          }
        ]
      },
      ` : ''}plugins: [
        new HtmlWebpackPlugin({
          chunksSortMode: 'none',
          template: './src/index.html',
          assetsPrefix: hasProductionBasePath ? \`/\${basePath}\` : ''
        }),
        new DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify(mode),
            basePath: JSON.stringify(hasProductionBasePath ? basePath : null)
          }
        }),
        new CleanWebpackPlugin(),
        ...isProduction || isProductionTest
          ? [
            new CopyWebpackPlugin({
              patterns: [
                {from: 'src/css', to: 'css'}${hasGithubAppOption()
                  ? `,\n${' '.repeat(16)}{from: 'src/404.html', to: ''},\n${
                    ' '.repeat(16)}{from: '.gitignore', to: ''}`
                  : ''}
              ]
            })
          ]
          : []
      ],
      devServer: {
        contentBase: 'src',
        port: 5556,
        historyApiFallback: {
          index: '/'
        }
      }
    };
  `;

  writeFileSync('webpack.config.js', getFileContent(webpackContents));
};

const getFileContent = (str, tabsCount = 2, tabsSize = 2, trimLinesCount = 1) => {
  return str
    .split('\n')
    .slice(trimLinesCount)
    .map((line) => line.slice(tabsCount * tabsSize))
    .join('\n');
};

const createSrc = () => {
  mkdirSync(join(currentWorkingDirectory, 'src'));
  createIndex();
  mkdirSync(join(currentWorkingDirectory, 'src/js'));
  createMainJs();
  createMainCss();
  mkdirSync(join(currentWorkingDirectory, 'src/js/models'));
  mkdirSync(join(currentWorkingDirectory, 'src/js/controllers'));
  mkdirSync(join(currentWorkingDirectory, 'src/js/components'));
  createApi();

  if (!hasJsxOption()) {
    createDom();
  }

  if (hasRouterOption()) {
    createRouter();
    createPages();
  }

  createGitignore();

  if (hasGithubAppOption()) {
    create404();
  }
};

const createIndex = () => {
  const indexContents = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${dirname}</title>
        <link rel="stylesheet" href="<%= htmlWebpackPlugin.options.assetsPrefix %>/css/main.css" />
      </head>
      <body>
        <div id="app"></div>
      </body>
    </html>
  `;

  writeFileSync('src/index.html', getFileContent(indexContents));
};

const createMainJs = () => {
  const mainJsWithRouterContents = `
    import Mvc from 'crizmas-mvc';

    import router from './router';

    new Mvc({
      router,
      domElement: document.querySelector('#app')
    });
  `;

  const mainJsWithoutRouterWithJsxContents = `
    import Mvc from 'crizmas-mvc';
    import React from 'react';

    const Main = () => {
      return <div>Hello, world! Date: {String(mainController.date)}</div>;
    };

    const mainController = Mvc.controller({
      date: new Date()
    });

    new Mvc({
      component: Main,
      domElement: document.querySelector('#app')
    });
  `;

  const mainJsWithoutRouterWithoutJsxContents = `
    import Mvc from 'crizmas-mvc';

    import {div} from './dom';

    const Main = () => {
      return div(
        null,
        \`Hello, world! Date: \${mainController.date}\`);
    };

    const mainController = Mvc.controller({
      date: new Date()
    });

    new Mvc({
      component: Main,
      domElement: document.querySelector('#app')
    });
  `;

  writeFileSync(
    'src/js/main.js',
    getFileContent(hasRouterOption()
      ? mainJsWithRouterContents
      : hasJsxOption()
        ? mainJsWithoutRouterWithJsxContents
        : mainJsWithoutRouterWithoutJsxContents));
};

const createMainCss = () => {
  const mainCssContents = `
    *{outline:none;}
    body{margin:0;font-family:arial;}
  `;

  mkdirSync(join(currentWorkingDirectory, 'src/css'));
  writeFileSync('src/css/main.css', getFileContent(mainCssContents));
};

const createApi = () => {
  mkdirSync(join(currentWorkingDirectory, 'src/js/api'));

  const httpContents = `
    const headers = {
      'Content-Type': 'application/json;charset=utf-8'
    };

    export const makeApi = (origin) => {
      const call = (path, method, data, queryObj) => {
        return fetch(\`\${origin}/\${path}\${getQueryString(queryObj)}\`, {
          method,
          mode: 'cors',
          body: data && JSON.stringify(data),
          headers
        }).then((response) => {
          if (!response.ok) {
            return Promise.reject(response);
          }

          return response;
        });
      };

      const getQueryString = (queryObj) => {
        if (queryObj) {
          const params = new URLSearchParams(queryObj);

          return \`?\${params}\`;
        }

        return '';
      };

      const get = (url, queryObj) => call(url, 'get', null, queryObj);

      const post = (url, data, queryObj) => call(url, 'post', data, queryObj);

      const put = (url, data, queryObj) => call(url, 'put', data, queryObj);

      const del = (url, queryObj) => call(url, 'delete', null, queryObj);

      const getJson = (...args) => get(...args).then((r) => r.json());

      return {
        get,
        post,
        put,
        del,
        getJson
      };
    };
  `;

  writeFileSync('src/js/api/http.js', getFileContent(httpContents));
};

const createDom = () => {
  const domContents = `
    import React from 'react';

    export const createFactory = (componentOrTag) =>
      (...args) => React.createElement(componentOrTag, ...args);

    export const fragment = createFactory(React.Fragment);
    export const div = createFactory('div');
  `;

  writeFileSync('src/js/dom.js', getFileContent(domContents));
};

const createRouter = () => {
  const routerForGithubAppContents = `
    import Router from 'crizmas-router';

    const resolveWith = async (componentPromise, routeControllerPromise) => ({
      component: componentPromise && (await componentPromise).default,
      controller: routeControllerPromise && (await routeControllerPromise).default
    });

    export default new Router({
      basePath: process.env.basePath,
      routes: [
        {
          controller: {
            onEnter({router}) {
              const path = router.url.searchParams.get('path');

              if (path) {
                router.transitionTo(\`\${path}\${router.url.hash}\`);
              }
            }
          },
          children: [
            {
              path: '*',
              resolve: () => resolveWith(
                import(/* webpackChunkName: 'not-found' */ './pages/not-found/not-found'))
            },
            {
              resolve: () => resolveWith(
                import(/* webpackChunkName: 'home' */ './pages/home/home'),
                import(/* webpackChunkName: 'home' */ './pages/home/home-route-controller'))
            }
          ]
        }
      ]
    });
  `;

  const routerForNonGithubAppContents = `
    import Router from 'crizmas-router';

    const resolveWith = async (componentPromise, routeControllerPromise) => ({
      component: componentPromise && (await componentPromise).default,
      controller: routeControllerPromise && (await routeControllerPromise).default
    });

    export default new Router({
      basePath: process.env.basePath,
      routes: [
        {
          path: '*',
          resolve: () => resolveWith(
            import(/* webpackChunkName: 'not-found' */ './pages/not-found/not-found'))
        },
        {
          resolve: () => resolveWith(
            import(/* webpackChunkName: 'home' */ './pages/home/home'),
            import(/* webpackChunkName: 'home' */ './pages/home/home-route-controller'))
        }
      ]
    });
  `;

  writeFileSync(
    'src/js/router.js',
    getFileContent(hasGithubAppOption()
      ? routerForGithubAppContents
      : routerForNonGithubAppContents));
};

const createPages = () => {
  mkdirSync(join(currentWorkingDirectory, 'src/js/pages'));
  mkdirSync(join(currentWorkingDirectory, 'src/js/pages/home'));
  mkdirSync(join(currentWorkingDirectory, 'src/js/pages/not-found'));

  const homeComponentWithJsxContents = `
    import React from 'react';

    export default ({controller}) => {
      return <div>Hello, world! Date: {String(controller.date)}</div>;
    };
  `;

  const homeComponentWithoutJsxContents = `
    import {div} from '../../dom';

    export default ({controller}) => {
      return div(
        null,
        \`Hello, world! Date: \${controller.date}\`);
    };
  `;

  const homeRouteControllerContents = `
    import Mvc from 'crizmas-mvc';

    export default Mvc.controller(function HomeRouteController() {
      const ctrl = {
        date: new Date()
      };

      return ctrl;
    });
  `;

  const notFoundContents = `
    export default () => {
      return 'Not found!';
    };
  `;

  writeFileSync(
    'src/js/pages/home/home.js',
    getFileContent(hasJsxOption()
      ? homeComponentWithJsxContents
      : homeComponentWithoutJsxContents));
  writeFileSync(
    'src/js/pages/home/home-route-controller.js',
    getFileContent(homeRouteControllerContents));
  writeFileSync(
    'src/js/pages/not-found/not-found.js',
    getFileContent(notFoundContents));
};

const createGitignore = () => {
  const gitignoreContents = `
    dist
    node_modules
    npm-debug.log
    nginx
  `;

  writeFileSync('.gitignore', getFileContent(gitignoreContents));
};

const create404 = () => {
  const fourZeroFourContents = `
    <html>
    <head>
    <script>
    (function () {
      'use strict';

      var modernBrowserUrl = 'https://raulsebastianmihaila.github.io/modern-browser-alert/';

      function getRedirectUrl() {
        var pathname = location.pathname;
        var secondSlashIndex = pathname.indexOf('/', 1);
        var path = pathname.slice(secondSlashIndex);
        // include ending slash because otherwise 404 is returned
        var basePath = pathname.slice(0, secondSlashIndex + 1);
        var url = new URL(location);

        url.pathname = basePath;
        url.searchParams.set('path', path);

        return url;
      }

      function redirect(url) {
        window.location.href = url;
      }

      try {
        redirect(getRedirectUrl());
      } catch (e) {
        redirect(modernBrowserUrl);
      }
    })();
    </script>
    </head>
    </html>
  `;

  writeFileSync('src/404.html', getFileContent(fourZeroFourContents));
};

main();