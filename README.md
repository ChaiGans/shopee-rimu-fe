# React + TypeScript + Vite

## Shop Telegram actions

The authenticated shop table exposes one shadcn/ui three-dot `DropdownMenu` per shop. It
keeps shop editing, Telegram configuration removal, and Telegram connectivity
testing together. `Ping Telegram` sends no credentials from the browser; the
backend loads the encrypted destination for the owned shop and reports whether
Telegram accepted the test message.

```mermaid
graph LR
    User[Authenticated user] --> Home[Home shop table]
    Home --> Menu[Three-dot shop actions]
    Menu --> Edit[Edit Shop dialog]
    Menu --> Clear[Clear Telegram]
    Menu --> Ping[Ping Telegram]
    Clear --> ShopAPI[shopService]
    Ping --> ShopAPI
    ShopAPI --> Backend[rimu-be-go]
    Backend --> Telegram[Telegram Bot API]
    Backend --> ShopAPI
    ShopAPI --> Home
```

`Edit Shop` uses the existing shop update API. `Clear Telegram` updates the
shop record with `clear_telegram_config`; `Ping Telegram` calls
`POST /api/shop/:shop_id/telegram/ping` and shows success or failure in a toast.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Dependency flow

This browser application owns presentation and user interaction. It calls the
authenticated Go backend through the shared Axios client; it never calls the
MSP controller or Python stages directly.

```mermaid
graph LR
    User[User] --> App[React and Vite application]
    App --> Auth[Auth context and protected routes]
    App --> Features[Shops orders products shipping]
    Auth --> API[Axios API client]
    Features --> API
    API --> Backend[rimu-be-go]
    Backend --> Shopee[(Shopee APIs)]
    Backend --> Controller[rimu-msp controller]
    App --> BrowserState[(Cookies and local storage)]
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
