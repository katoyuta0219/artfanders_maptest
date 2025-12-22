// export default function Home() {
//   return (
//     <main className='flex min-h-screen flex-col items-center justify-between p-24'>
//       <div className='z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex'>
//         {/* <SimpleMap /> ← 消す */}
//         <p>Homeページ</p>
//       </div>
//     </main>
//   );
// }

// 'use client';

// import { useRouter } from 'next/navigation';

// const places = [
//     {
//         name: '名古屋市科学館',
//         lat: 35.1643,
//         lng: 136.9025,
//     },
//     {
//         name: '名古屋城',
//         lat: 35.1850,
//         lng: 136.8990,
//     },
// ];

// export default function NavigationPage() {
//     const router = useRouter();

//     return (
//         <div style={{ padding: 20 }}>
//             <h1>行き先を選択</h1>

//             {places.map((p) => (
//                 <button
//                     key={p.name}
//                     onClick={() =>
//                         router.push(
//                             `/navigation/map?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}`
//                         )
//                     }
//                     style={{
//                         display: 'block',
//                         margin: '12px 0',
//                         padding: '12px',
//                     }}
//                 >
//                     {p.name}
//                 </button>
//             ))}
//         </div>
//     );
// }

'use client';

import { useRouter } from 'next/navigation';

const places = [
  { name: '名古屋市科学館', lat: 35.1643, lng: 136.9025 },
  { name: '名古屋城', lat: 35.1850, lng: 136.8990 },
];

export default function Page() {
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
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}