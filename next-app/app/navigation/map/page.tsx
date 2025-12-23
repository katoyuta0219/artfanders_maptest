'use client';

import { useEffect, useState } from 'react';
import NavigationMap from '../../../components/Maps/NavigationMap';

type Destination = {
    lat: number;
    lng: number;
    name: string;
};

export default function NavigationMapPage() {
    const [destination, setDestination] = useState<Destination | null>(null);

    // ✅ クエリパラメータ取得（useSearchParams 不使用）
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const latParam = params.get('lat');
        const lngParam = params.get('lng');
        const nameParam = params.get('name');

        if (!latParam || !lngParam) {
            return;
        }

        setDestination({
            lat: Number(latParam),
            lng: Number(lngParam),
            name: nameParam ?? '目的地',
        });
    }, []);

    // ✅ クエリ取得中 or 不正な場合
    if (!destination) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                地図を準備しています...
            </div>
        );
    }

    return (
        <NavigationMap
            destination={{
                lat: destination.lat,
                lng: destination.lng,
                name: destination.name,
            }}
        />
    );
}
