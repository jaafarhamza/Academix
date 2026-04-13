import { CenterExpenseService } from './center-expense.service';

describe('CenterExpenseService', () => {
  let service: CenterExpenseService;

  beforeEach(() => {
    service = new CenterExpenseService();
  });

  it('returns center-expense module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'center-expense',
      status: 'ready',
    });
  });
});
