import MapClient from './MapClient';

type Props = {
  searchParams: {
    lat?: string;
    lng?: string;
  };
};

export default function Page({ searchParams }: Props) {
  const destLat = Number(searchParams.lat);
  const destLng = Number(searchParams.lng);

  if (Number.isNaN(destLat) || Number.isNaN(destLng)) {
    return <div>目的地が指定されていません</div>;
  }

  return <MapClient destLat={destLat} destLng={destLng} />;
}