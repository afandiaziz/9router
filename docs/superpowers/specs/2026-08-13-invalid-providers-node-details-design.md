# Invalid Providers Node Details and Typography — Design

**Tanggal**: 2026-08-13
**Target**: `~/9router-fork`
**Status**: Disetujui

## Goal

Menampilkan detail provider node pada grouping Invalid Providers, khususnya custom provider, dan meningkatkan ukuran font halaman agar konsisten dengan dashboard Providers.

## Architecture

`GET /api/providers/invalid` tetap menjadi sumber data server-side. Route mengambil provider nodes, mencocokkan raw `connection.provider` dengan `node.id`, lalu menyertakan metadata aman (`id`, `name`, `prefix`, `type`, `apiType`, `baseUrl`) pada setiap provider group. Raw provider ID tetap dipertahankan untuk grouping, React key, dan bulk action.

Komponen `InvalidProviderGroup` menampilkan nama node, raw ID/prefix, tipe/API type, dan endpoint dengan fallback ke raw provider ID bila node tidak ditemukan. Credential fields tidak pernah diteruskan ke client.

Typography dinaikkan dari ukuran 13px menjadi hierarchy dashboard yang terbaca: judul halaman/group lebih besar, metadata/tabs/table minimal `text-sm`, dan icon group proporsional. Layout responsive yang ada dipertahankan.

## Data Contract

```js
{
  provider: "oc-abc123",
  providerDetails: {
    id: "oc-abc123",
    name: "My OpenAI Node",
    prefix: "oc-",
    type: "openai-compatible",
    apiType: "openai",
    baseUrl: "https://example.com/v1"
  },
  total: 2,
  buckets: {}
}
```

`providerDetails` dapat bernilai `null` bila provider node tidak ditemukan. UI wajib fallback ke `provider`.

## Error Handling and Security

Kegagalan mengambil provider nodes tidak boleh membuat daftar invalid providers gagal seluruhnya; route menggunakan daftar kosong dan fallback raw provider ID. Sanitizer allow-list tetap diterapkan pada connection payload dan node metadata hanya berisi field non-secret. URL ditampilkan terpotong secara visual dengan nilai penuh tersedia melalui `title`.

## Testing

- Custom node ID menghasilkan metadata node yang benar.
- Raw provider ID tetap digunakan untuk grouping.
- Provider tanpa matching node fallback tanpa crash.
- Metadata response tidak berisi credential fields.
- Existing grouping/bulk behavior tetap lulus.
- Build dan test unit terkait berhasil.
