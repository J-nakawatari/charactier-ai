// カスタムESLintルール: API重複を機械的に防ぐ

const fs = require('fs');
const path = require('path');

// 既に登録されているルートを追跡
const registeredRoutes = new Map();

module.exports = {
  rules: {
    'no-duplicate-routes': {
      meta: {
        type: 'problem',
        docs: {
          description: 'APIルートの重複を禁止',
          category: 'Possible Errors'
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            // app.get(), app.post(), app.put(), app.delete() を検出
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'app' &&
              ['get', 'post', 'put', 'delete'].includes(node.callee.property.name)
            ) {
              const method = node.callee.property.name.toUpperCase();
              const pathArg = node.arguments[0];
              
              if (pathArg && pathArg.type === 'Literal') {
                const apiPath = pathArg.value;
                const routeKey = `${method}:${apiPath}`;
                
                if (registeredRoutes.has(routeKey)) {
                  const existingFile = registeredRoutes.get(routeKey);
                  context.report({
                    node,
                    message: `重複するAPIルート: ${method} ${apiPath} は既に ${existingFile} で定義されています`
                  });
                } else {
                  registeredRoutes.set(routeKey, context.getFilename());
                }
              }
            }
            
            // app.use() でマウントされるルートも追跡
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'app' &&
              node.callee.property.name === 'use'
            ) {
              const pathArg = node.arguments[0];
              const routerArg = node.arguments[1];
              
              if (pathArg && pathArg.type === 'Literal' && routerArg) {
                const mountPath = pathArg.value;
                const routeKey = `MOUNT:${mountPath}`;
                
                if (registeredRoutes.has(routeKey)) {
                  const existingFile = registeredRoutes.get(routeKey);
                  context.report({
                    node,
                    message: `重複するマウントパス: ${mountPath} は既に ${existingFile} で使用されています`
                  });
                } else {
                  registeredRoutes.set(routeKey, context.getFilename());
                }
              }
            }
          }
        };
      }
    },
    
    'use-route-registry': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'ルート定義時にレジストリの使用を推奨',
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'app' &&
              ['get', 'post', 'put', 'delete'].includes(node.callee.property.name)
            ) {
              context.report({
                node,
                message: 'RouteRegistry.define() の使用を検討してください（重複防止のため）'
              });
            }
          }
        };
      }
    }
  }
};