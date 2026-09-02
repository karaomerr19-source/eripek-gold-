import './globals.css'
export const metadata={title:'Eripek Gold | Master Porcelenta',description:'Eripek Gold garanti, servis ve porselen tasarım portalı',icons:{icon:'/master-porcelenta-icon.png',apple:'/master-porcelenta-icon.png'}}
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#fffdfa'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
