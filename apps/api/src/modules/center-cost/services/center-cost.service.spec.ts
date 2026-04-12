import { CenterCostService } from './center-cost.service';

describe('CenterCostService', () => {
  let service: CenterCostService;

  beforeEach(() => {
    service = new CenterCostService();
  });

  it('returns center-cost module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'center-cost',
      status: 'ready',
    });
  });
});
