"use client";

import { useRouter } from "next/navigation";

export default function DestinationsPage() {
    const router = useRouter();

    const destinations = [
        { name: "東京駅", lat: 35.681236, lng: 139.767125 },
        { name: "大阪駅", lat: 34.702485, lng: 135.495951 },
        { name: "神戸駅", lat: 34.6795,   lng: 135.1780 },
    ];

    const handleClick = (d: any) => {
        router.push(`/map?lat=${d.lat}&lng=${d.lng}`);
    };

    return (
        <div style={{ padding: 20 }}>
            <h1>目的地一覧</h1>
            {destinations.map((d) => (
                <button
                    key={d.name}
                    onClick={() => handleClick(d)}
                    style={{ display: "block", margin: "10px 0" }}
                >
                    {d.name}
                </button>
            ))}
        </div>
    );
}