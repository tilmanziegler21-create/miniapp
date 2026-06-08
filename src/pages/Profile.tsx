import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Star, Gift, Clock, Package, ChevronRight, Heart } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { bonusesAPI, favoritesAPI, orderAPI } from '../services/api';
import { useAnalytics } from '../hooks/useAnalytics';
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-sky-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Профиль</h1>
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">{userLevel.icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.firstName}</h2>
            <p className="text-blue-100">{userLevel.title}</p>
            <p className="text-blue-100 text-sm">@{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Bonus Card */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Бонусный баланс</h3>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {bonusBalance}
            </div>
          </div>
          
          <div className={`${userLevel.bgColor} rounded-lg p-3`}>
            <div className={`font-semibold ${userLevel.color} mb-2`}>
              {userLevel.title}
            </div>
            <div className="space-y-1">
              {userLevel.benefits.map((benefit, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                  <span>•</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm p-1 flex">
          <button
            onClick={() => {
              setActiveTab('orders');
              trackEvent('profile_tab_click', { tab: 'orders' });
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
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
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bonuses'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
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
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>Избранное</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {activeTab === 'orders' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">У вас еще нет заказов</p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Перейти в каталог
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">Заказ #{order.id}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Товаров:</span>
                        <span>{order.itemCount} шт.</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Сумма:</span>
                        <span className="font-semibold">{order.totalAmount.toLocaleString()}₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Доставка:</span>
                        <span>{order.deliveryMethod === 'courier' ? 'Курьер' : 'Самовывоз'}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          navigate(`/order/${order.id}`);
                          trackEvent('view_order_details', { order_id: order.id });
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                      >
                        Подробнее
                      </button>
                      <button
                        onClick={() => {
                          // Repeat order logic would go here
                          WebApp.showAlert('Функция повторения заказа в разработке');
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-200 transition-colors"
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
          <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">История бонусов</h3>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <div className="font-medium">Заказ #ORD-ABC123</div>
                    <div className="text-sm text-gray-600">15.01.2024</div>
                  </div>
                  <div className="text-green-600 font-semibold">+50</div>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <div className="font-medium">Списание бонусов</div>
                    <div className="text-sm text-gray-600">10.01.2024</div>
                  </div>
                  <div className="text-blue-600 font-semibold">-30</div>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <div>
                    <div className="font-medium">Приветственный бонус</div>
                    <div className="text-sm text-gray-600">01.01.2024</div>
                  </div>
                  <div className="text-green-600 font-semibold">+100</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-sky-500 rounded-lg p-4 text-white">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="w-5 h-5" />
                <h3 className="font-semibold">Как получить бонусы?</h3>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Совершайте покупки - 1₽ = 1 бонус</li>
                <li>• Возвращайтесь за новыми заказами</li>
                <li>• Приводите друзей</li>
                <li>• Участвуйте в акциях</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'bonuses' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Доступно бонусов</div>
                <div className="text-xl font-bold text-blue-600">{bonusBalance}</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="font-semibold mb-3">История</div>
              {bonusHistory.length === 0 ? (
                <div className="text-sm text-gray-600">Пока нет операций</div>
              ) : (
                <div className="space-y-2">
                  {bonusHistory.slice(0, 20).map((x) => (
                    <div key={x.id} className="flex items-center justify-between text-sm">
                      <div className="text-gray-700">{x.type}</div>
                      <div className={`${Number(x.amount) < 0 ? 'text-blue-600' : 'text-sky-600'} font-semibold`}>{Number(x.amount)}</div>
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
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Пока нет избранных товаров</p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
                    className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center space-x-3 text-left"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{p.name}</div>
                      <div className="text-sm text-gray-600">{p.brand}</div>
                      <div className="text-xs text-gray-500">{p.category}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
