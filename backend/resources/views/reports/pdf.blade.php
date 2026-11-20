<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { color: #172b4d; font-family: DejaVu Sans, sans-serif; font-size: 10px; }
        h1 { font-size: 20px; margin: 0 0 6px; }
        .meta { color: #52657a; margin-bottom: 18px; }
        pre { white-space: pre-wrap; overflow-wrap: anywhere; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d5dde5; padding: 5px; text-align: left; vertical-align: top; }
        th { background: #eaf1f7; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">Generated {{ $generatedAt->toDateTimeString() }} | {{ count($rows) }} records</div>
    @if (count($rows) > 0 && is_array($rows[0]))
        <table>
            <thead><tr>@foreach (array_keys($rows[0]) as $heading)<th>{{ $heading }}</th>@endforeach</tr></thead>
            <tbody>
                @foreach ($rows as $row)
                    <tr>@foreach ($row as $value)<td>{{ is_array($value) || is_object($value) ? json_encode($value, JSON_UNESCAPED_SLASHES) : $value }}</td>@endforeach</tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p>No records available.</p>
    @endif
</body>
</html>