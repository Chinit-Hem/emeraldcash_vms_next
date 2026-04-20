/** Database Singleton - Neon PostgreSQL Connection */
import { neon } from '@neondatabase/serverless';
import type { NeonQueryFunction } from '@neondatabase/serverless';

interface ConnectionConfig {
url: string;
