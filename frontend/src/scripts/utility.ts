export function naturalSort(a: string, b: string) {
    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}

export function copyToClipboard(data: string) {
    const el = document.createElement('textarea');
    el.value = data;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
