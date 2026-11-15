import { useState } from 'react'
import type { AssetWithUrls } from '@contracts/features/assets'
import { Download, Film, Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import { api, must } from '@/lib/api'
import { toDateStr, fmt } from '@/lib/dates'
import { bytes, plural } from '@/lib/format'
import { useAction, useData } from '@/lib/queries'
import { PageShell } from '@/shell/PageHeader'
import { ConfirmDialog, Dialog } from '@/ui/dialog'
import { Button, Empty, Field, Input, Segmented } from '@/ui/primitives'
import { toast } from '@/ui/toast'

type Filter = 'all' | 'image' | 'video'

export function FilesPage() {
  const run = useAction()
  const { data: assets = [], isLoading } = useData(['assets'], () => api.getAssets({ limit: 500 }))
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const [removing, setRemoving] = useState<AssetWithUrls | null>(null)
  const shown = assets.filter((asset) => filter === 'all' || asset.type === filter)
  const open = assets.find((asset) => asset.id === openId) ?? null
  const total = assets.reduce((sum, asset) => sum + (asset.size ?? 0), 0)

  const upload = async () => {
    const { path } = await api.openFileDialog({ filters: [{ name: 'Photos and videos', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov', 'webm'] }] })
    if (path) await run(() => must(api.uploadAsset(path), 'The file could not be added'), { success: 'Added to your files' })
  }

  const download = async (asset: AssetWithUrls) => {
    const result = await api.downloadAsset(asset.id, asset.originalName ?? asset.filename)
    if (result.canceled) return
    if (result.ok) toast.success('Saved a copy', result.path)
    else toast.error('The file was not saved', result.error)
  }

  return (
    <PageShell
      title="Files"
      subtitle={assets.length > 0 ? `${plural(assets.length, 'file')} · ${bytes(total)} · kept in your data folder` : 'Photos and videos attached to your records.'}
      actions={
        <Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={() => void upload()}>
          Add file
        </Button>
      }
      toolbar={assets.length > 0 ? <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'image', label: 'Photos' }, { value: 'video', label: 'Videos' }]} label="Type" /> : undefined}
    >
      {assets.length === 0 && !isLoading ? (
        <Empty icon={<ImageIcon />} title="No files yet" action={<Button onClick={() => void upload()}>Add a photo or video</Button>}>
          Attach a progress photo to a weigh-in or a picture to a meal while logging, and it shows up here.
        </Empty>
      ) : shown.length === 0 ? (
        <Empty title={filter === 'video' ? 'No videos' : 'No photos'} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
          {shown.map((asset) => (
            <button key={asset.id} type="button" onClick={() => setOpenId(asset.id)} className="card group overflow-hidden text-left transition-colors hover:border-faint/70">
              <div className="relative grid aspect-square place-items-center bg-bg/60">
                {asset.type === 'video' && asset.thumbnailUrl === asset.assetUrl ? <Film className="h-8 w-8 text-faint" /> : <img src={asset.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                {asset.type === 'video' && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-2xs text-white">Video</span>}
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium">{asset.originalName ?? asset.filename}</p>
                <p className="truncate text-xs text-faint">{[asset.createdAt ? fmt.full(toDateStr(new Date(asset.createdAt))) : null, asset.size ? bytes(asset.size) : null].filter(Boolean).join(' · ')}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Dialog
          open
          onClose={() => setOpenId(null)}
          title={open.originalName ?? open.filename}
          width={760}
          footer={
            <>
              <Button variant="ghost" className="mr-auto text-bad hover:bg-bad/15 hover:text-bad" icon={<Trash2 className="h-4 w-4" />} onClick={() => setRemoving(open)}>
                Delete
              </Button>
              <Button icon={<Download className="h-4 w-4" />} onClick={() => void download(open)}>
                Save a copy
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid max-h-[56vh] place-items-center overflow-hidden rounded-xl bg-bg">
              {open.type === 'video' ? <video src={open.assetUrl} controls className="max-h-[56vh] w-full" /> : <img src={open.assetUrl} alt={open.originalName ?? ''} className="max-h-[56vh] object-contain" />}
            </div>
            <Rename key={open.id} asset={open} />
          </div>
        </Dialog>
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Delete this file?"
        onConfirm={() => {
          const id = removing?.id
          setRemoving(null)
          setOpenId(null)
          if (id) void run(() => must(api.deleteAsset(id), 'The file was not deleted'))
        }}
      >
        It is removed from your data folder and from any record it is attached to.
      </ConfirmDialog>
    </PageShell>
  )
}

function Rename({ asset }: { asset: AssetWithUrls }) {
  const run = useAction()
  const [name, setName] = useState(asset.originalName ?? asset.filename)
  const commit = () => {
    const next = name.trim()
    if (next && next !== (asset.originalName ?? asset.filename)) void run(() => must(api.updateAsset(asset.id, { originalName: next }), 'The name was not saved'))
  }
  return (
    <Field label="Name">
      {(id) => <Input id={id} value={name} onChange={(event) => setName(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} />}
    </Field>
  )
}
