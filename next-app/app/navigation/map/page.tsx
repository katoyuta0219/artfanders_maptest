'use client';

import { useSearchParams } from 'next/navigation';
import NavigationMap from '../../../components/Maps/NavigationMap';

export default function NavigationMapPage() {
    const params = useSearchParams();

    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    const name = params.get('name') ?? '目的地';

    return (
        <NavigationMap
            destination={{
                lat,
                lng,
                name,
            }}
        />
    );
}