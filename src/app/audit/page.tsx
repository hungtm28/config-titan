'use client';
import { useState, useMemo } from 'react';
import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    Column,
    SortingState,
    ColumnFiltersState,
    ColumnResizeMode,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


// Helper function to safely get nested properties
const get = (obj: any, path: string, defaultValue: any = '') => {
    if (!obj || typeof path !== 'string') return defaultValue;
    const keys = path.replace(/\.([0-9]+)/g, '[$1]').replace(/\[/g, '.').replace(/\]/g, '').split('.');
    let result = obj;
    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }
    return result === undefined || result === null ? defaultValue : result;
};

// Data type for a table row
type Profile = {
    file: string;
    job_name: string;
    profile: number;
    variantIdx: any;
    baseRes: string;
    codec: string;
    bitrate: string;
    fps: string;
    gop: string;
    frame_type: string;
    quality: string;
    enabled_logos_variant: string;
    enabled_logos_track: string;
    output: string;
};

// Filter component for each column
function Filter({ column }: { column: Column<any, unknown> }) {
  const columnFilterValue = column.getFilterValue();
  return (
    <Input
      type="text"
      value={(columnFilterValue ?? '') as string}
      onChange={e => column.setFilterValue(e.target.value)}
      placeholder={`Search...`}
      className="h-8 p-1 w-full border-input"
      onClick={(e) => e.stopPropagation()} // Prevent sorting when clicking on the filter input
    />
  );
}

export default function AuditProfilePage() {
    const [data, setData] = useState<Profile[]>([]);
    const [fileName, setFileName] = useState('');
    const [debugMessage, setDebugMessage] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
     const [columnResizeMode, setColumnResizeMode] = useState<ColumnResizeMode>('onChange');


    const columns = useMemo<ColumnDef<Profile>[]>(() => [
        { accessorKey: 'file', header: 'File', size: 150 },
        { accessorKey: 'job_name', header: 'Job Name', size: 150 },
        { accessorKey: 'profile', header: 'Profile', size: 60 },
        { accessorKey: 'variantIdx', header: 'VariantIdx', size: 60 },
        { accessorKey: 'baseRes', header: 'BaseRes', size: 100 },
        { accessorKey: 'codec', header: 'Codec', size: 100 },
        { accessorKey: 'bitrate', header: 'Bitrate', size: 80 },
        { accessorKey: 'fps', header: 'FPS', size: 60 },
        { accessorKey: 'gop', header: 'GOP', size: 60 },
        { accessorKey: 'frame_type', header: 'Frame type', size: 100 },
        { accessorKey: 'quality', header: 'Quality/CPUtunning', size: 120 },
        { accessorKey: 'enabled_logos_variant', header: 'Enabled Logos (Variant)', size: 250 },
        { accessorKey: 'enabled_logos_track', header: 'Enabled Logos (Track)', size: 250 },
        { accessorKey: 'output', header: 'Output', size: 250 },
    ], []);

    const table = useReactTable({
        data,
        columns,
        columnResizeMode,
        state: {
            sorting,
            columnFilters,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    // --- Data Handling Functions ---
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                try {
                    const jsonData = JSON.parse(content);
                    const extractedProfiles = extractProfiles(jsonData, file.name);
                    setData(extractedProfiles);
                    if (extractedProfiles.length > 0) {
                        setDebugMessage('OK (Đọc file và map profile/variant/logo/output thành công).');
                    } else {
                        setDebugMessage('Warning: Không tìm thấy profile nào hợp lệ trong file.');
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                    setDebugMessage(`Error: ${errorMessage}`);
                    alert('Invalid or unsupported JSON file structure');
                    setData([]);
                }
            };
            reader.readAsText(file);
        }
    };

    const extractProfiles = (jsonData: any, fileName: string): Profile[] => {
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;
        if (!data) return [];
        const videoTrack = get(data, 'Device.Template.Tracks.VideoTracks.0', {});
        const allVariants = get(videoTrack, 'Variants', []);
        const trackLogos = get(videoTrack, 'LogoInsertions', []);
        const formatConfigurations = get(data, 'Device.Template.FormatConfigurations', []);
        const muxerConfigObject = formatConfigurations.find((config: any) => get(config, 'Type') === 'Multi TS');
        const muxerProfiles = muxerConfigObject ? get(muxerConfigObject, 'TSMuxer.Profiles', []) : [];
        if (!Array.isArray(muxerProfiles) || muxerProfiles.length === 0) return [];

        return muxerProfiles.map((muxerProfile: any, index: number): Profile => {
            const variantIdx = get(muxerProfile, 'TracksMapping.VideoTrackList.0.VariantIdx', -1);
            const variant = variantIdx !== -1 && allVariants[variantIdx] ? allVariants[variantIdx] : {};
            const resolution = get(variant, 'FrameSizeParameters.Resolution', 'Custom');
            const width = get(variant, 'FrameSizeParameters.Width');
            const height = get(variant, 'FrameSizeParameters.Height');
            const baseRes = resolution === 'Custom' && width && height ? `${width}x${height}` : resolution;
            const bitrate = get(variant, 'Encoding.Bitrate', 0);
            const variantLogos = get(variant, 'LogoInsertions', []).filter((l: any) => get(l, 'Enable')).map((l: any) => `${get(l, 'FileName', 'N/A')} (${get(l, 'Top', 0)},${get(l, 'Left', 0)},${get(l, 'Size', 0)})`).join(' | ');
            const trackLogosStr = trackLogos.filter((l: any) => get(l, 'Enable')).map((l: any) => `${get(l, 'FileName', 'N/A')} (${get(l, 'Top', 0)},${get(l, 'Left', 0)},${get(l, 'Size', 0)})`).join(' | ');
            const outputUrl = get(data, `Outputs.0.${index}.Outputs.0.Url`, 'N/A');
            return {
                file: fileName, job_name: get(data, 'Name', 'N/A'), profile: index, variantIdx: variantIdx === -1 ? 'N/A' : variantIdx, baseRes: baseRes,
                codec: get(variant, 'Encoding.Codec', 'N/A'), bitrate: bitrate ? (bitrate / 1000000).toFixed(1) : 'N/A', fps: get(variant, 'FrameRateParameters.FrameRate', 'N/A'),
                gop: get(variant, 'Encoding.GopParameters.GopSize', 'N/A'), frame_type: get(variant, 'Encoding.FrameType', 'N/A'), quality: get(variant, 'VideoQuality.PremiumVideoQuality', 'N/A'),
                enabled_logos_variant: variantLogos || 'N/A', enabled_logos_track: trackLogosStr || 'N/A', output: outputUrl,
            };
        });
    };

    const downloadCSV = () => {
        if (data.length === 0) return;
        const headers = columns.map(c => c.header as string).join(',');
        const csv = data.map(row => 
            Object.values(row).map(value => {
                const strValue = String(value);
                return strValue.includes(',') || strValue.includes('"') ? `"${strValue.replace(/"/g, '""')}"` : strValue;
            }).join(',')
        ).join('\n');
        const blob = new Blob([`\uFEFF${headers}\n${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${fileName.replace(/\.json|\./g, '')}_audit.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const clearTable = () => {
        setData([]); setFileName(''); setDebugMessage('');
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0 mb-4">
                <h1 className="text-2xl font-bold">Upload JSON → Audit Profile</h1>
            </header>

            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                            <Input id="file-upload" type="file" accept=".json" onChange={handleFileUpload} className="max-w-xs" />
                            <Button onClick={downloadCSV} disabled={table.getCoreRowModel().rows.length === 0}>Tải CSV</Button>
                            <Button onClick={clearTable} disabled={table.getCoreRowModel().rows.length === 0} variant="destructive">Xóa bảng</Button>
                        </div>
                    </div>
                    <div className='mt-4 text-sm text-muted-foreground'>
                        - Nếu BaseRes = Custom thì BaseRes sẽ tự lấy giá trị từ Size(px) (Width x Height).<br/>
                        - Logo hiển thị dạng: <code>file.png (Top,Left,Size)</code><br/>
                        - Thứ tự cột theo yêu cầu: BaseRes → Codec → Bitrate → FPS → GOP
                    </div>
                    {debugMessage && <p className={'text-sm mt-2 font-medium ' + (data.length > 0 ? 'text-green-500' : 'text-yellow-500')}>{`Debug: ${debugMessage}`}</p>}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0">
                    {/* Fixed Header */}
                    <div className="border rounded-t-md">
                         <Table style={{ tableLayout: 'fixed', width: table.getTotalSize() }}>
                            <TableHeader>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id} style={{ width: header.getSize() }} className="p-2 relative align-top">
                                                <div
                                                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                                {header.column.getCanFilter() ? (
                                                    <div className="mt-2"><Filter column={header.column} /></div>
                                                ) : null}
                                                <div
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                                                />
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                        </Table>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto border-x border-b rounded-b-md">
                        <Table style={{ tableLayout: 'fixed', width: table.getTotalSize() }}>
                             <TableBody>
                                {table.getRowModel().rows.length ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="whitespace-pre-wrap break-words p-2 font-mono text-xs">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                <CardFooter className="flex-shrink-0 flex items-center justify-between py-2">
                     <div className="text-sm text-muted-foreground">
                        {table.getFilteredRowModel().rows.length} row(s) found.
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
