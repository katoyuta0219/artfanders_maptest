import MapClient from './MapClient';

type Props = {
    searchParams: {
        lat?: string;
        lng?: string;
    };
};

export default function Page({ searchParams }: Props) {
    if (!searchParams.lat || !searchParams.lng) {
        return <div>目的地が指定されていません</div>;
    }

    const destLat = Number(searchParams.lat);
    const destLng = Number(searchParams.lng);

    if (Number.isNaN(destLat) || Number.isNaN(destLng)) {
        return <div>目的地の形式が不正です</div>;
    }

    return <MapClient destLat={destLat} destLng={destLng} />;
}
