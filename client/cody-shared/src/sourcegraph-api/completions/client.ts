import { ConfigurationWithAccessToken } from '../../configuration'

import { Event, CompletionCallbacks, CompletionParameters, CompletionResponse } from './types'

export interface CompletionLogger {
    startCompletion(params: CompletionParameters | {}):
        | undefined
        | {
              onError: (error: string) => void
              onComplete: (response: string | CompletionResponse | string[] | CompletionResponse[]) => void
              onEvents: (events: Event[]) => void
          }
}

export type CompletionsClientConfig = Pick<
    ConfigurationWithAccessToken,
    'serverEndpoint' | 'accessToken' | 'debugEnable' | 'customHeaders'
>

export abstract class SourcegraphCompletionsClient {
    private errorEncountered = false

    constructor(protected config: CompletionsClientConfig, protected logger?: CompletionLogger) {}

    public onConfigurationChange(newConfig: CompletionsClientConfig): void {
        this.config = newConfig
    }

    protected get completionsEndpoint(): string {
        return new URL('/.api/completions/stream', this.config.serverEndpoint).href
    }

    protected get codeCompletionsEndpoint(): string {
        return new URL('/.api/completions/code', this.config.serverEndpoint).href
    }

    protected sendEvents(events: Event[], cb: CompletionCallbacks): void {
        for (const event of events) {
            switch (event.type) {
                case 'completion':
                    cb.onChange(event.completion)
                    break
                case 'error':
                    this.errorEncountered = true
                    cb.onError(event.error)
                    break
                case 'done':
                    if (!this.errorEncountered) {
                        cb.onComplete()
                    }
                    break
            }
        }
    }

    public abstract stream(params: CompletionParameters, cb: CompletionCallbacks): () => void
    public abstract complete(params: CompletionParameters, abortSignal: AbortSignal): Promise<CompletionResponse>
}
