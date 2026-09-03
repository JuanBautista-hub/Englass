import type { Provider } from '@angular/core';
import { MockApiService } from '../services/mock-api.service';
import { environment } from '../../../environments/environment';

export const mockApiProvider: Provider = {
  provide: MockApiService,
  useFactory: () => (environment.useMockApi ? new MockApiService() : new MockApiService()),
};