import { syncMyClock } from '../../utils/clockSync';
import { useDeployCalendarStore } from '../../store/useDeployCalendarStore';

const flush = () => new Promise((r) => setTimeout(r, 0));

test('syncMyClock: 같은 세션이면 한 번만 받고(요청 3개 = 최근 3달), force 면 다시 받는다', async () => {
  const fetchMock = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ Status: '200', Data: [{ COL_DATE: '2026-11-02', S_TIME: '2026-11-02 08:58:03', E_TIME: '2026-11-02 22:22:24' }] }),
  }));
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  const session = { sid: 'E-clock-test', origin: 'https://logine.ecount.com' };

  syncMyClock(session);
  syncMyClock(session);
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(useDeployCalendarStore.getState().clock_records['2026-11-02']).toEqual({ in: '08:58', out: '22:22' });

  syncMyClock(session, true);
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(6);
});
