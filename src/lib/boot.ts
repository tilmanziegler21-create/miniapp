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
  const startedAt = Date.now();
  const minSplashMs = 1800;
  boot.reset();
  boot.setProgress(12, 'Подключаемся…');

  try {
    boot.setProgress(22, 'Подбираем лучшие цены…');
    const config = await useConfigStore.getState().load();
    boot.setProgress(38, 'Готовим витрину…');

    const cities = (config?.cities || [])
      .map((c) => String(c.code || '').trim())
      .filter(Boolean);

    const city = useCityStore.getState().ensureCity(cities);
    boot.setProgress(52, city ? 'Проверяем город доставки…' : 'Почти готово…');

    if (city) {
      const hasCachedCatalog = useCatalogStore.getState().hydrateFromDisk(city);
      boot.setProgress(hasCachedCatalog ? 68 : 58, hasCachedCatalog ? 'Показываем сохранённый каталог…' : 'Прогружаем каталог…');
      await Promise.race([
        useCatalogStore.getState().prefetch(city),
        sleep(2800),
      ]);
      boot.setProgress(82, 'Обновляем наличие товаров…');

      if (tgId) {
        boot.setProgress(90, 'Собираем корзину и избранное…');
        await Promise.allSettled([
          useCartStore.getState().syncCart(city),
          useFavoritesStore.getState().load(city),
        ]);
      }
    }

    const remainingMs = minSplashMs - (Date.now() - startedAt);
    if (remainingMs > 0) await sleep(remainingMs);
    boot.setProgress(100, 'Готово');
    boot.setReady(true);
  } catch (e) {
    console.error('Boot pipeline warning:', e);
    const remainingMs = minSplashMs - (Date.now() - startedAt);
    if (remainingMs > 0) await sleep(remainingMs);
    boot.setProgress(100, 'Готово');
    boot.setReady(true);
  }
}
