/** Layout limpo para páginas destinadas à impressão (sem menus do sistema). */
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
