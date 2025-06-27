import { Router } from 'express';
import authRoutes from '../auth';
import characterRoutes from '../characters';
import modelRoutes from '../modelSettings';
import notificationRoutes from '../notifications';
import systemSettingsRoutes from '../systemSettings';
import publicSystemSettingsRoutes from '../publicSystemSettings';
import systemRoutes from '../system';
import debugRoutes from '../debug';
import userRoutes from '../user';

const v1Router = Router();

// Mount all routes under v1
// NOTE: 現在、このv1Routerは使用されていません。
// 全てのルートは直接index.tsで登録されています。
v1Router.use('/auth', authRoutes);
v1Router.use('/characters', characterRoutes);
v1Router.use('/admin/models', modelRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/system-settings', publicSystemSettingsRoutes); // 公開API（認証不要）
v1Router.use('/admin/system-settings', systemSettingsRoutes); // 管理者API（認証必要）
v1Router.use('/admin/system', systemRoutes);
v1Router.use('/debug', debugRoutes);
v1Router.use('/user', userRoutes);

export default v1Router;