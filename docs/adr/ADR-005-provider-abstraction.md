# ADR-005: Provider Abstraction Pattern

**Tarih:** 2026-04-27
**Durum:** Kabul edildi

## Bağlam

BranchScout 5+ dış servise bağlı: Google Places, MERSİS, news, LLM (Anthropic), transcription (Whisper). Bunlar fiyat, lisans, regülasyon nedeniyle değişebilir. Test'te de gerçek API'ye çağrı atmak istemeyiz.

## Karar

Her dış servis için interface + concrete implementasyon + test mock:

```ts
interface PlacesProvider { searchNearby(...): Promise<...>; ... }
class GooglePlacesProvider implements PlacesProvider { ... }
class InMemoryPlacesProvider implements PlacesProvider { ... } // testlerde
```

Konfigürasyon (`config.ts`) hangi implementasyonun kullanılacağını seçer. Production'da `Concrete...Provider`, test'te `InMemory...Provider`.

## Alternatifler

- **Doğrudan SDK çağrısı**: Test edilemez, sağlayıcı değişimi büyük refactor.
- **Service mesh / sidecar pattern**: Banka bulut altyapısı için aşırı.

## Sonuçlar

**Artılar:** Test'lenebilir, sağlayıcı değişimi tek konfigürasyon, multi-provider fallback chain mümkün.

**Eksiler:** Her servis için 3 dosya (interface + concrete + mock); küçük overhead.
