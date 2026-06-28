import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Star, Gift, Clock, Package, ChevronRight, Heart } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { bonusesAPI, favoritesAPI, orderAPI } from '../services/api';
import { useAnalytics } from '../hooks/useAnalytics';
import { formatCurrency } from '../lib/currency';
import WebApp from '@twa-dev/sdk';
import { useCityStore } from '../store/useCityStore';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  deliveryMethod: string;
  createdAt: string;
  itemCount: number;
}

type FavoriteItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { trackEvent } = useAnalytics();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'bonuses' | 'favorites'>('orders');
  const [bonusBalance, setBonusBalance] = useState(0);
  const [bonusHistory, setBonusHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const { city } = useCityStore();

  useEffect(() => {
    loadOrderHistory();
    loadBonuses();
    trackEvent('view_profile', { user_id: user?.tgId });
  }, [city]);

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      if (!city) {
        setOrders([]);
        return;
      }
      const response = await orderAPI.getHistory(city);
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to load order history:', error);
      WebApp.showAlert('Ошибка загрузки истории заказов');
    } finally {
      setLoading(false);
    }
  };

  const loadBonuses = async () => {
    try {
      const [b, h] = await Promise.all([bonusesAPI.balance(), bonusesAPI.history()]);
      setBonusBalance(Number(b.data.balance || 0));
      setBonusHistory(h.data.history || []);
    } catch (e) {
      console.error('Failed to load bonuses:', e);
      setBonusBalance(0);
      setBonusHistory([]);
    }
  };

  const loadFavorites = async () => {
    try {
      if (!city) {
        setFavorites([]);
        return;
      }
      const resp = await favoritesAPI.list(city);
      setFavorites(resp.data.favorites || []);
    } catch (e) {
      console.error('Failed to load favorites:', e);
      setFavorites([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'buffer': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-indigo-100 text-indigo-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'buffer': return 'В обработке';
      case 'pending': return 'Ожидает';
      case 'paid': return 'Оплачен';
      case 'assigned': return 'Назначен курьер';
      case 'picked_up': return 'В пути';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const getUserLevelInfo = () => {
    switch (user?.status) {
      case 'VIP':
        return {
          title: 'VIP Клиент',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: '👑',
          benefits: ['5% скидка на все товары', 'Приоритетная доставка', 'Персональный менеджер']
        };
      case 'ELITE':
        return {
          title: 'Elite Клиент',
          color: 'text-sky-600',
          bgColor: 'bg-sky-100',
          icon: '💎',
          benefits: ['10% скидка на все товары', 'Бесплатная доставка', 'Эксклюзивные предложения']
        };
      default:
        return {
          title: 'Обычный клиент',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: '⭐',
          benefits: ['Бонусная программа', 'Акции и скидки']
        };
    }
  };

  const userLevel = getUserLevelInfo();

  return (
    <div className="gold-glow min-h-screen px-4 pb-28 pt-4 text-white">
      <div className="rounded-[28px] border border-sky-400/15 bg-[#100f12]/90 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight">Профиль</h1>
          <button
            onClick={() => navigate('/')}
            className="rounded-2xl border border-sky-400/15 bg-sky-400/10 p-2 text-sky-300 transition-colors hover:bg-sky-400/15"
          >
            <User className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-2xl">
            <span>{userLevel.icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.firstName || 'Пользователь'}</h2>
            <p className="text-sm text-sky-300">{userLevel.title}</p>
            <p className="text-sm text-slate-400">@{user?.username || 'telegram'}</p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-sky-400/15 bg-sky-400/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-sky-300" />
              <h3 className="font-semibold">Бонусный баланс</h3>
            </div>
            <div className="text-2xl font-black text-sky-300">{bonusBalance}</div>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            {userLevel.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-sky-300">•</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 mb-4">
        <div className="flex rounded-[24px] border border-sky-400/15 bg-[#100f12]/90 p-1 shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
          <button
            onClick={() => {
              setActiveTab('orders');
              trackEvent('profile_tab_click', { tab: 'orders' });
            }}
            className={`flex-1 rounded-[18px] py-3 px-3 text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-sky-400/20 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Заказы</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('bonuses');
              trackEvent('profile_tab_click', { tab: 'bonuses' });
            }}
            className={`flex-1 rounded-[18px] py-3 px-3 text-sm font-medium transition-colors ${
              activeTab === 'bonuses'
                ? 'bg-sky-400/20 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Gift className="w-4 h-4" />
              <span>Бонусы</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('favorites');
              loadFavorites();
              trackEvent('profile_tab_click', { tab: 'favorites' });
            }}
            className={`flex-1 rounded-[18px] py-3 px-3 text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-sky-400/20 text-sky-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>Избранное</span>
            </div>
          </button>
        </div>
      </div>

      <div className="pb-4">
        {activeTab === 'orders' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-300"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto mb-3 h-12 w-12 text-slate-500" />
                <p className="text-slate-400">У вас еще нет заказов</p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="mt-3 rounded-2xl bg-gradient-to-b from-sky-300 to-blue-500 px-4 py-2 text-white transition-colors hover:opacity-90"
                >
                  Перейти в каталог
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-[24px] border border-sky-400/15 bg-[#100f12]/90 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">Заказ #{order.id}</h4>
                        <p className="text-sm text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Товаров:</span>
                        <span>{order.itemCount} шт.</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Сумма:</span>
                        <span className="font-semibold">{formatCurrency(Number(order.totalAmount || 0))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Доставка:</span>
                        <span>{order.deliveryMethod === 'courier' ? 'Курьер' : 'Самовывоз'}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          navigate(`/order/${order.id}`);
                          trackEvent('view_order_details', { order_id: order.id });
                        }}
                        className="flex-1 rounded-2xl bg-gradient-to-b from-sky-300 to-blue-500 py-2 px-3 text-sm text-white transition-colors hover:opacity-90"
                      >
                        Подробнее
                      </button>
                      <button
                        onClick={() => {
                          // Repeat order logic would go here
                          WebApp.showAlert('Функция повторения заказа в разработке');
                        }}
                        className="flex-1 rounded-2xl border border-sky-400/15 bg-sky-400/8 py-2 px-3 text-sm text-slate-200 transition-colors hover:bg-sky-400/12"
                      >
                        Повторить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bonuses' && (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-sky-400/15 bg-[#100f12]/90 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">История бонусов</h3>
                <Clock className="w-5 h-5 text-slate-400" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <div className="font-medium">Заказ #ORD-ABC123</div>
                    <div className="text-sm text-slate-400">15.01.2024</div>
                  </div>
                  <div className="font-semibold text-sky-300">+50</div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <div className="font-medium">Списание бонусов</div>
                    <div className="text-sm text-slate-400">10.01.2024</div>
                  </div>
                  <div className="font-semibold text-blue-300">-30</div>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div>
                    <div className="font-medium">Приветственный бонус</div>
                    <div className="text-sm text-slate-400">01.01.2024</div>
                  </div>
                  <div className="font-semibold text-sky-300">+100</div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-gradient-to-r from-blue-600 to-sky-500 p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.32)]">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="w-5 h-5" />
                <h3 className="font-semibold">Как получить бонусы?</h3>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Совершайте покупки - 1€ = 1 бонус</li>
                <li>• Возвращайтесь за новыми заказами</li>
                <li>• Приводите друзей</li>
                <li>• Участвуйте в акциях</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'bonuses' && (
          <div className="mt-4 space-y-3">
            <div className="rounded-[24px] border border-sky-400/15 bg-[#100f12]/90 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">Доступно бонусов</div>
                <div className="text-xl font-bold text-sky-300">{bonusBalance}</div>
              </div>
            </div>
            <div className="rounded-[24px] border border-sky-400/15 bg-[#100f12]/90 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
              <div className="mb-3 font-semibold">История</div>
              {bonusHistory.length === 0 ? (
                <div className="text-sm text-slate-400">Пока нет операций</div>
              ) : (
                <div className="space-y-2">
                  {bonusHistory.slice(0, 20).map((x) => (
                    <div key={x.id} className="flex items-center justify-between text-sm">
                      <div className="text-slate-300">{x.type}</div>
                      <div className={`${Number(x.amount) < 0 ? 'text-blue-300' : 'text-sky-300'} font-semibold`}>{Number(x.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="mx-auto mb-3 h-12 w-12 text-slate-500" />
                <p className="text-slate-400">Пока нет избранных товаров</p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="mt-3 rounded-2xl bg-gradient-to-b from-sky-300 to-blue-500 px-4 py-2 text-white transition-colors hover:opacity-90"
                >
                  Перейти в каталог
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="flex w-full items-center space-x-3 rounded-[24px] border border-sky-400/15 bg-[#100f12]/90 p-4 text-left shadow-[0_18px_44px_rgba(0,0,0,0.48)]"
                  >
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-sm text-slate-400">{p.brand}</div>
                      <div className="text-xs text-slate-500">{p.category}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
