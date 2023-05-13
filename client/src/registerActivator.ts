import { ExtensionHelperFunction } from '@zettelyay/extension-api'

export const registerActivator: ExtensionHelperFunction<
  'pagePanelRendered',
  'pagePanelRendered',
  [{ activate: () => Promise<void> }],
  { activateActivator: () => void }
> = function ({ pagePanelRenderedApi }, { activate }) {
  const activatorRegistration = this.register(
    pagePanelRenderedApi.registry.activator(async () => {
      try {
        await activate()
        return 'activated'
      } catch {
        return 'not activated'
      }
    }),
    {
      initiallyInactive: true,
    }
  )

  return {
    activateActivator() {
      activatorRegistration.activate()
    },
  }
}
