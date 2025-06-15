/**
 * 🔴 API重複を機械的に防ぐESLintカスタムルール
 */

const noDuplicateRoutes = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent duplicate API route definitions',
      category: 'Best Practices',
      recommended: true
    },
    fixable: null,
    schema: []
  },
  create(context) {
    const registeredRoutes = new Set();
    
    return {
      CallExpression(node) {
        // app.get(), app.post(), app.put(), app.delete() の呼び出しを検出
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'app' &&
          ['get', 'post', 'put', 'delete'].includes(node.callee.property.name) &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          const method = node.callee.property.name.toUpperCase();
          const path = node.arguments[0].value;
          const routeKey = `${method}:${path}`;
          
          if (registeredRoutes.has(routeKey)) {
            context.report({
              node,
              message: `🔴 重複するAPIルート: ${method} ${path} は既に定義されています`
            });
          } else {
            registeredRoutes.add(routeKey);
          }
        }
      }
    };
  }
};

const useRouteRegistry = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer using RouteRegistry over direct app methods',
      category: 'Best Practices',
      recommended: true
    },
    fixable: 'code',
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        // app.get(), app.post(), app.put(), app.delete() の呼び出しを検出
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'app' &&
          ['get', 'post', 'put', 'delete'].includes(node.callee.property.name)
        ) {
          const method = node.callee.property.name;
          
          context.report({
            node,
            message: `⚠️ app.${method}() の代わりに routeRegistry.define() を使用してください`,
            fix(fixer) {
              const methodUpper = method.toUpperCase();
              const sourceCode = context.getSourceCode();
              const argsText = node.arguments.map(arg => sourceCode.getText(arg)).join(', ');
              
              return fixer.replaceText(
                node,
                `routeRegistry.define('${methodUpper}', ${argsText})`
              );
            }
          });
        }
      }
    };
  }
};

module.exports = {
  rules: {
    'no-duplicate-routes': noDuplicateRoutes,
    'use-route-registry': useRouteRegistry
  }
};