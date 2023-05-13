export type PageExtensionData = undefined | PageExtensionData.Enabled | PageExtensionData.Activated

export namespace PageExtensionData {
  export interface Enabled {
    readonly enabled: true
    readonly command?: string
  }

  export interface Activated {
    readonly enabled?: undefined
    readonly signedInEmail: string
    readonly document?: {
      readonly id: string
      readonly title: string
    }
  }
}
