'use client';

import { useRouter } from 'next/navigation';

const places = [
    {
        name: '名古屋市科学館',
        lat: 35.1643,
        lng: 136.9025,
    },
    {
        name: '名古屋城',
        lat: 35.1850,
        lng: 136.8990,
    },
];

export default function NavigationPage() {
    const router = useRouter();

    return (
        <div style={{ padding: 20 }}>
            <h1>行き先を選択</h1>

            {places.map((p) => (
                <button
                    key={p.name}
                    onClick={() =>
                        router.push(
                            `/navigation/map?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}`
                        )
                    }
                    style={{
                        display: 'block',
                        margin: '12px 0',
                        padding: '12px',
                    }}
                >
                    {p.name}
                </button>
            ))}
        </div>
    );
}
