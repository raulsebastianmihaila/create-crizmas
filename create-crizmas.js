#!/usr/bin/env node

'use strict';

const {writeFileSync, mkdirSync} = require('fs');
const {basename} = require('path');

const flagTypes = {
  all: 'all',
  router: 'router',
  form: 'form',
  components: 'components',
  jsx: 'jsx',
  layout: 'layout',
  githubApp: 'githubApp',
  help: 'help'
};

const optionsMap = new Map([
  [flagTypes.all, ['-A', '--all']],
  [flagTypes.router, ['-R', '--router']],
  [flagTypes.form, ['-F', '--form']],
  [flagTypes.components, ['-C', '--components']],
  [flagTypes.jsx, ['-JSX', '--jsx']],
  [flagTypes.layout, ['-L', '--layout']],
  [flagTypes.githubApp, ['-GA', '--github-app']],
  [flagTypes.help, ['-H', '--help']]
]);

const knownOptions = new Set([...optionsMap.values()].flat());

const packagesDependencies = new Map([
  [
    'crizmas-mvc',
    [
      'react',
      'react-dom'
    ]
  ],
  [
    'crizmas-router',
    [
      'crizmas-mvc',
      'prop-types',
      'react'
    ]
  ],
  [
    'crizmas-form',
    [
      'crizmas-mvc'
    ]
  ],
  [
    'crizmas-components',
    [
      'crizmas-mvc',
      'prop-types',
      'react',
      'smart-mix'
    ]
  ]
]);

const commonDependencies = [
  'cross-env',
  'css-loader',
  'css-minimizer-webpack-plugin',
  'html-webpack-plugin',
  'mini-css-extract-plugin',
  'webpack',
  'webpack-cli',
  'webpack-dev-server'
];

const jsxDependencies = [
  '@babel/core',
  '@babel/preset-react',
  'babel-loader'
];

const githubAppDependencies = [
  'copy-webpack-plugin'
];

const versions = new Map([
  ['@babel/core', '^7.17.5'],
  ['@babel/preset-react', '^7.16.7'],
  ['babel-loader', '^8.2.3'],
  ['copy-webpack-plugin', '^10.2.4'],
  ['crizmas-components', '^2.1.2'],
  ['crizmas-form', '^2.0.2'],
  ['crizmas-mvc', '^2.0.5'],
  ['crizmas-router', '^2.0.5'],
  ['cross-env', '^7.0.3'],
  ['css-loader', '^6.6.0'],
  ['css-minimizer-webpack-plugin', '^3.4.1'],
  ['html-webpack-plugin', '^5.5.0'],
  ['mini-css-extract-plugin', '^2.5.3'],
  ['prop-types', '^15.8.1'],
  ['react', '^17.0.2'],
  ['react-dom', '^17.0.2'],
  ['smart-mix', '^2.0.1'],
  ['webpack', '^5.69.1'],
  ['webpack-cli', '^4.9.2'],
  ['webpack-dev-server', '^4.7.4']
]);

const passedOptions = new Set(process.argv.slice(2));
const dirname = basename(process.cwd());

const main = () => {
  if (checkUnknownOptions()) {
    return;
  }

  if (checkHelpOption()) {
    return;
  }

  if (checkLayoutOptionInconsistency()) {
    return ;
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
    console.log('-L or --layout');
    console.log('      - adds a root layout component that renders a spinner during router'
      + ' transitions and passes it to the Mvc instance. Requires the -R option;');
    console.log('-A or --all');
    console.log('      - equivalent to -R -F -C -L -JSX;');
    console.log('-GA or --github-app');
    console.log('      - adds support for deploying as a github page;');
    console.log('-H or --help');
    console.log('      - displays helpful information about the command.');

    return true;
  }
};

const checkLayoutOptionInconsistency = () => {
  if (hasLayoutOption() && !hasRouterOption()) {
    console.error('When using the -L or --layout option, the -R or --router option must be passed'
      + ' as well.');

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

const hasLayoutOption = () => {
  return hasAllOption() || isFlagActive(flagTypes.layout);
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

  if (hasGithubAppOption()) {
    addGithubAppDependencies(dependenciesSet);
  }

  const packageJson = {
    name: dirname,
    private: true,
    scripts: {
      start: 'cross-env NODE_ENV=development webpack serve',
      build: 'cross-env NODE_ENV=production webpack'
    },
    dependencies: Object.fromEntries([...dependenciesSet].sort().map((dependency) => {
      return [dependency, versions.get(dependency)];
    }))
  };

  writeFileSync(
    'package.json',
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

const addGithubAppDependencies = (dependenciesSet) => {
  githubAppDependencies.forEach((dependency) => {
    dependenciesSet.add(dependency);
  });
};

const createWebpackConfig = () => {
  const webpackContents = `
    'use strict';

    const path = require('path');
    const webpack = require('webpack');
    const HtmlWebpackPlugin = require('html-webpack-plugin');
    const MiniCssExtractPlugin = require('mini-css-extract-plugin');
    const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');${
      hasGithubAppOption()
        ? '\n    const CopyWebpackPlugin = require(\'copy-webpack-plugin\');'
        : ''
    }

    const {DefinePlugin} = webpack;
    const mode = process.env.NODE_ENV;
    const basePath = ${hasGithubAppOption() ? `'${dirname}'` : `null`};
    const isProductionTest = false;
    const isProduction = mode === 'production' && !isProductionTest;
    const isProductionLike = isProduction || isProductionTest;
    const hasProductionBasePath = isProduction && !!basePath;

    module.exports = {
      mode,
      devtool: 'source-map',
      entry: './src/js/main.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: hasProductionBasePath ? \`/\${basePath}/\` : '/',
        filename: isProductionLike ? '[name].bundle-[contenthash].js' : '[name].bundle.js',
        clean: true
      },
      resolve: {
        extensions: ${hasJsxOption() ? `['.js', '.jsx']` : `['.js']`}
      },
      module: {
        rules: [
          {
            include: /${hasComponentsOption() ? '(crizmas-|smart-mix)' : 'crizmas-'}/,
            sideEffects: false
          },
          {
            test: /\\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
            sideEffects: true
          }${
            hasJsxOption()
              ? `,\n${getFragmentContent(getWebpackBabelLoaderFragment(), 3)}`
              : ''
          }
        ]
      },
      ...isProductionLike
        && {
          optimization: {
            minimizer: [
              '...',
              new CssMinimizerPlugin()
            ]
          }
        },
      plugins: [
        new HtmlWebpackPlugin({
          chunksSortMode: 'none',
          template: './src/index.html',
          assetsPrefix: hasProductionBasePath ? \`/\${basePath}\` : ''
        }),
        new MiniCssExtractPlugin({
          filename: isProductionLike ? '[name].[contenthash].css' : '[name].css'
        }),
        new DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify(mode),
            basePath: JSON.stringify(hasProductionBasePath ? basePath : null)
          }
        })${
          hasGithubAppOption()
            ? `,\n${getFragmentContent(getWebpackCopyPluginFragment(), 2)}`
            : ''
        }
      ],
      devServer: {
        port: 5556,
        historyApiFallback: {
          index: '/'
        }
      }
    };
  `;

  writeFileSync('webpack.config.js', getFileContent(webpackContents));
};

const getFragmentContent = (
  str,
  tabsCount,
  tabsSize = 2,
  trimStartLinesCount = 1,
  trimEndLinesCount = 1) => {
  return str
    .split('\n')
    .slice(trimStartLinesCount, -trimEndLinesCount)
    .map((line) => `${' '.repeat(tabsCount * tabsSize)}${line}`)
    .join('\n');
};

const getWebpackBabelLoaderFragment = () => {
  return `
    {
      test: /\\.jsx?$/,
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
  `;
};

const getWebpackCopyPluginFragment = () => {
  return `
    ...isProduction || isProductionTest
      ? [
        new CopyWebpackPlugin({
          patterns: [
            {from: 'src/404.html', to: ''},
            {from: '.gitignore', to: ''}
          ]
        })
      ]
      : []
  `;
};

const getFileContent = (str, tabsCount = 2, tabsSize = 2, trimLinesCount = 1) => {
  return str
    .split('\n')
    .slice(trimLinesCount)
    .map((line) => line.slice(tabsCount * tabsSize))
    .join('\n');
};

const createSrc = () => {
  mkdirSync('src');
  createIndex();
  mkdirSync('src/js');
  createMainJs();
  createMainCss();
  mkdirSync('src/js/models');
  mkdirSync('src/js/controllers');
  mkdirSync('src/js/components');
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
    <html lang="en-EN">
      <head>
        <meta charset="utf-8" />
        <title>${dirname}</title>
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

    import router from './router';${
      hasLayoutOption()
        ? '\n    import Layout from \'./pages/layout/layout\';'
        : ''
    }

    import '../css/main.css';

    new Mvc({${hasLayoutOption() ? `
      component: Layout,` : ''}
      router,
      domElement: document.querySelector('#app')
    });
  `;

  const mainJsWithoutRouterWithJsxContents = `
    import Mvc, {controller} from 'crizmas-mvc';
    import React from 'react';

    import '../css/main.css';

    const Main = () => {
      return <div>Hello, world! Date: {String(mainController.date)}</div>;
    };

    const mainController = controller({
      date: new Date()
    });

    new Mvc({
      component: Main,
      domElement: document.querySelector('#app')
    });
  `;

  const mainJsWithoutRouterWithoutJsxContents = `
    import Mvc, {controller} from 'crizmas-mvc';

    import {div} from './dom';

    import '../css/main.css';

    const Main = () => {
      return div(
        null,
        \`Hello, world! Date: \${mainController.date}\`);
    };

    const mainController = controller({
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
  const mainCssContents = `${hasLayoutOption() ? `${`
    @keyframes spin{0%{opacity:0;}50%{opacity:1;}100%{transform:rotate(360deg);opacity:0;}}
    .transition-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.5);
      z-index:99999;}
    .transition-overlay::after{content:'';position:fixed;top:0;left:0;right:0;bottom:0;width:3px;
      height:80px;background:#000;margin:auto;transform-origin:50%;
      animation:spin 2s linear infinite;}`}` : ''}
    *{outline:none;}
    body{margin:0;font-family:arial;}
  `;

  mkdirSync('src/css');
  writeFileSync('src/css/main.css', getFileContent(mainCssContents));
};

const createApi = () => {
  mkdirSync('src/js/api');

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
  mkdirSync('src/js/pages');
  mkdirSync('src/js/pages/home');
  mkdirSync('src/js/pages/not-found');

  if (hasLayoutOption()) {
    mkdirSync('src/js/pages/layout');
  }

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
    import {controller} from 'crizmas-mvc';

    export default controller(function HomeRouteController() {
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

  const layoutWithJsxContents = `
    import React from 'react';

    export default ({router, children}) => <>
      {router.isTransitioning && <div className="transition-overlay" />}
      {children}
    </>;
  `;

  const layoutWithoutJsxContents = `
    import {fragment, div} from '../../dom';

    export default ({router, children}) => fragment(
      null,
      router.isTransitioning && div({className: 'transition-overlay'}),
      children);
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

  if (hasLayoutOption()) {
    writeFileSync(
      'src/js/pages/layout/layout.js',
      getFileContent(hasJsxOption()
        ? layoutWithJsxContents
        : layoutWithoutJsxContents));
  }
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
