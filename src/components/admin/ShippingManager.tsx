import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Save, 
  MapPin, 
  Zap, 
  Store as StoreIcon, 
  Gift, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Search,
  Check
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useStoreData } from '../../context/StoreDataContext';
import { StoreShippingConfig, ShippingOption } from '../../types';
import { 
  fetchShippingConfig, 
  saveShippingConfig, 
  calculateShippingOptions,
  lookupCep,
  DEFAULT_SHIPPING_CONFIG 
} from '../../services/shippingService';
import { formatCurrency } from '../../utils/formatters';

export const ShippingManager: React.FC = () => {
  const { currentStore } = useTenant();
  const { showNotification } = useStoreData();
  const currentStoreId = currentStore?.id || 'suamarcaaqui';

  const [config, setConfig] = useState<StoreShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [originCityState, setOriginCityState] = useState<string>('');

  // Estados do Simulador de Teste
  const [testCep, setTestCep] = useState<string>('01310-100');
  const [testAmount, setTestAmount] = useState<string>('89.90');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedOptions, setSimulatedOptions] = useState<ShippingOption[]>([]);
  const [simulatedAddress, setSimulatedAddress] = useState<string | null>(null);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchShippingConfig(currentStoreId);
        setConfig(data);
        // Tenta descobrir a cidade do CEP de origem
        if (data.originCep) {
          const { address } = await lookupCep(data.originCep);
          if (address) {
            setOriginCityState(`${address.city} - ${address.state}`);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de frete:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentStoreId]);

  const handleOriginCepChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    const masked = clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
    setConfig((prev) => ({ ...prev, originCep: masked }));

    if (clean.length === 8) {
      const { address } = await lookupCep(clean);
      if (address) {
        setOriginCityState(`${address.city} - ${address.state} (${address.neighborhood || ''})`);
      } else {
        setOriginCityState('');
      }
    } else {
      setOriginCityState('');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const { success, error } = await saveShippingConfig(currentStoreId, config);
      if (success) {
        showNotification('Regras de frete e envio salvas com sucesso!', 'success');
      } else {
        showNotification(error || 'Erro ao salvar regras de frete.', 'error');
      }
    } catch (err: any) {
      showNotification('Erro ao salvar frete.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulatorError(null);
    setSimulatedOptions([]);
    setSimulatedAddress(null);

    const clean = testCep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setSimulatorError('Informe um CEP de destino válido com 8 dígitos.');
      return;
    }

    setIsSimulating(true);
    try {
      const parsedAmount = parseFloat(testAmount.replace(',', '.')) || 0;
      const res = await calculateShippingOptions({
        destinationCep: clean,
        cartTotal: parsedAmount,
        storeId: currentStoreId,
        configOverride: config,
      });

      if (res.error) {
        setSimulatorError(res.error);
      } else {
        setSimulatedOptions(res.options);
        if (res.address) {
          setSimulatedAddress(`${res.address.street ? res.address.street + ', ' : ''}${res.address.neighborhood ? res.address.neighborhood + ' - ' : ''}${res.address.city}/${res.address.state}`);
        }
      }
    } catch (err: any) {
      setSimulatorError('Falha ao simular opções de frete.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Carregando configurações de frete...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs border border-sky-100 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Gestão de Frete & Envio</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                Produtos Físicos
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina as regras de entrega para seus produtos físicos. Produtos digitais continuam com download imediato sem cobrança de frete.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* 1. CEP de Origem da Loja */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-theme-primary" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">CEP de Origem (Postagem da Loja)</h2>
              <p className="text-[11px] text-slate-500">Endereço de onde seus produtos físicos saem para entrega.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                CEP de Saída da Encomenda
              </label>
              <input
                type="text"
                value={config.originCep}
                onChange={(e) => handleOriginCepChange(e.target.value)}
                placeholder="00000-000"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-theme-primary font-mono font-bold"
              />
              {originCityState && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{originCityState}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 2. Grid de Regras de Frete Fixo / Econômico e Expresso */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card: Frete Econômico (PAC) */}
          <div className={`bg-white p-6 rounded-3xl border transition-all ${config.economicEnabled ? 'border-sky-300 shadow-xs' : 'border-slate-200 opacity-80'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Frete Econômico (PAC)</h3>
                  <p className="text-[10px] text-slate-500">Opção de menor custo para o comprador</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.economicEnabled}
                  onChange={(e) => setConfig({ ...config, economicEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome de Exibição no Checkout</label>
                <input
                  type="text"
                  value={config.economicName}
                  onChange={(e) => setConfig({ ...config, economicName: e.target.value })}
                  placeholder="Ex: Frete Econômico (PAC)"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Fixo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.economicPrice}
                    onChange={(e) => setConfig({ ...config, economicPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prazo Estimado</label>
                  <input
                    type="text"
                    value={config.economicDeadline}
                    onChange={(e) => setConfig({ ...config, economicDeadline: e.target.value })}
                    placeholder="Ex: 5 a 8 dias úteis"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Frete Expresso (Sedex) */}
          <div className={`bg-white p-6 rounded-3xl border transition-all ${config.expressEnabled ? 'border-amber-300 shadow-xs' : 'border-slate-200 opacity-80'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Frete Expresso (Sedex)</h3>
                  <p className="text-[10px] text-slate-500">Entrega rápida e prioritária</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.expressEnabled}
                  onChange={(e) => setConfig({ ...config, expressEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome de Exibição no Checkout</label>
                <input
                  type="text"
                  value={config.expressName}
                  onChange={(e) => setConfig({ ...config, expressName: e.target.value })}
                  placeholder="Ex: Frete Expresso (Sedex)"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Fixo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.expressPrice}
                    onChange={(e) => setConfig({ ...config, expressPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prazo Estimado</label>
                  <input
                    type="text"
                    value={config.expressDeadline}
                    onChange={(e) => setConfig({ ...config, expressDeadline: e.target.value })}
                    placeholder="Ex: 1 a 3 dias úteis"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 3. Frete Grátis & Retirada no Local */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Card: Frete Grátis com Valor Mínimo */}
          <div className={`bg-white p-6 rounded-3xl border transition-all ${config.freeShippingEnabled ? 'border-emerald-300 shadow-xs' : 'border-slate-200 opacity-80'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Frete Grátis Promocional</h3>
                  <p className="text-[10px] text-slate-500">Incentive carrinhos maiores com frete 100% grátis</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.freeShippingEnabled}
                  onChange={(e) => setConfig({ ...config, freeShippingEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Mínimo do Pedido para Ganhar Frete Grátis (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="1"
                    value={config.freeShippingMinAmount}
                    onChange={(e) => setConfig({ ...config, freeShippingMinAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="150"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clientes que comprarem a partir de <strong>R$ {(config.freeShippingMinAmount ?? 0).toFixed(2).replace('.', ',')}</strong> terão a opção de Frete Grátis liberada automaticamente no checkout.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Retirada no Local Gratuita */}
          <div className={`bg-white p-6 rounded-3xl border transition-all ${config.pickupEnabled ? 'border-purple-300 shadow-xs' : 'border-slate-200 opacity-80'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <StoreIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Retirada no Local (Grátis)</h3>
                  <p className="text-[10px] text-slate-500">Permita que clientes da sua cidade retirem pessoalmente</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.pickupEnabled}
                  onChange={(e) => setConfig({ ...config, pickupEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Endereço / Ponto de Retirada</label>
                <input
                  type="text"
                  value={config.pickupAddress}
                  onChange={(e) => setConfig({ ...config, pickupAddress: e.target.value })}
                  placeholder="Ex: Rua das Flores, 123, Centro - Horário comercial"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prazo de Disponibilidade</label>
                <input
                  type="text"
                  value={config.pickupDeadline}
                  onChange={(e) => setConfig({ ...config, pickupDeadline: e.target.value })}
                  placeholder="Ex: Disponível em 1 dia útil"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* 4. Integrações Futuras: Melhor Envio */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
                ME
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Integração Melhor Envio</span>
                  <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                    Opcional / API
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cotação automática via API com Jadlog, Correios, Loggi e Latam Cargo.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.melhorEnvioEnabled}
                onChange={(e) => setConfig({ ...config, melhorEnvioEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Token da API do Melhor Envio (Bearer Token)
              </label>
              <input
                type="password"
                value={config.melhorEnvioToken || ''}
                onChange={(e) => setConfig({ ...config, melhorEnvioToken: e.target.value })}
                placeholder="Cole o seu Token de Acesso gerado no painel do Melhor Envio..."
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Caso o token não esteja preenchido ou a API do Melhor Envio fique indisponível, o sistema utiliza automaticamente com 100% de segurança as regras de frete fixo cadastradas acima.
              </p>
            </div>
          </div>
        </div>

      </form>

      {/* 5. Simulador ao Vivo de Teste do Lojista */}
      <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-theme-primary/20 text-theme-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Simulador de Frete em Tempo Real</h3>
              <p className="text-xs text-slate-400">Teste como as opções de envio aparecem para o cliente final.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">CEP de Destino para Teste</label>
            <input
              type="text"
              value={testCep}
              onChange={(e) => setTestCep(e.target.value)}
              placeholder="01310-100"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Valor do Pedido (R$)</label>
            <input
              type="number"
              step="0.01"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              placeholder="89.90"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary text-white font-bold"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full py-2.5 bg-theme-primary hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSimulating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4" />}
              <span>{isSimulating ? 'Calculando...' : 'Simular Frete'}</span>
            </button>
          </div>
        </form>

        {simulatorError && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
            {simulatorError}
          </div>
        )}

        {simulatedAddress && (
          <div className="text-xs text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Destino identificado: <strong>{simulatedAddress}</strong></span>
          </div>
        )}

        {simulatedOptions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {simulatedOptions.map((opt) => (
              <div
                key={opt.id}
                className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                {opt.isFree && (
                  <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Grátis
                  </span>
                )}
                <div>
                  <span className="text-xs font-bold text-white block">{opt.name}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Prazo: {opt.deadline}</span>
                  {opt.description && (
                    <span className="text-[10px] text-slate-500 block mt-1">{opt.description}</span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Valor</span>
                  <span className="text-sm font-black text-emerald-400">
                    {opt.price === 0 ? 'Grátis' : formatCurrency(opt.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
