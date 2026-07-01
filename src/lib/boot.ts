import { useBootStore } from '../store/useBootStore';
import { useConfigStore } from '../store/useConfigStore';
import { useCityStore } from '../store/useCityStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBootPipeline(tgId?: string) {
  const boot = useBootStore.getState();
  boot.reset();
  boot.setProgress(10, 'Подключаемся…');

  try {
    const config = await useConfigStore.getState().load();
    boot.setProgress(30, 'Загружаем настройки…');

    const cities = (config?.cities || [])
      .map((c) => String(c.code || '').trim())
      .filter(Boolean);

    const city = useCityStore.getState().ensureCity(cities);
    boot.setProgress(45, city ? 'Готовим витрину…' : 'Почти готово…');

    if (city) {
      useCatalogStore.getState().hydrateFromDisk(city);
      await Promise.race([
        useCatalogStore.getState().prefetch(city),
        sleep(2800),
      ]);
      boot.setProgress(80, 'Загружаем каталог…');

      if (tgId) {
        await Promise.allSettled([
          useCartStore.getState().syncCart(city),
          useFavoritesStore.getState().load(city),
        ]);
      }
    }

    boot.setProgress(100, 'Готово');
    boot.setReady(true);
  } catch (e) {
    console.error('Boot pipeline warning:', e);
    boot.setProgress(100, 'Готово');
    boot.setReady(true);
  }
}
