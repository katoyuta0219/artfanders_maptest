'use client';
import { Suspense } from "react";
import MapClient from "./MapClient";

export default function Map() {
    return (
        <Suspense fallback={<div>Loading map...</div>}>
            <MapClient />
        </Suspense>
    )
}