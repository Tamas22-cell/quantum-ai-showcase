import { createFileRoute, Link } from '@tanstack/react-router';
import Web3TerminalTest from '../../web3-terminal-test/Web3TerminalTest';

export const Route = createFileRoute('/web3-terminal')({
  head: () => ({meta:[{"property": "og:title", "content": "Web3 Market Terminal | Quantum AI Lab"}, {"property": "og:description", "content": "Experimental BTC, ETH and SOL market terminal with Kraken USD data and technical indicators."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {title:'Web3 Market Terminal | Quantum AI Lab'},{name:'description',content:'Experimental BTC, ETH and SOL market terminal with Kraken USD data and technical indicators.'}]}),
  component: Web3TerminalPage,
});
function Web3TerminalPage() {
  return <main style={{minHeight:'100vh',background:'#020617',padding:'28px 12px'}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <Link to="/" style={{color:'#93c5fd',display:'inline-block',marginBottom:18}}>← Back to portfolio</Link>
      <Web3TerminalTest />
    </div>
  </main>;
}
