/**
 * Load Inquiry Controller
 *
 * HTTP handlers for load inquiry endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { loadInquiryService } from './load-inquiries.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';

class LoadInquiryController {
    /**
     * Get all drivers who texted about a specific load ID
     *
     * GET /api/v1/load-inquiries/:loadId
     */
    async getByLoadId(
        request: FastifyRequest<{ Params: { loadId: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        const { loadId } = request.params;
        const inquiries = await loadInquiryService.getByLoadId(loadId);

        return reply.send(
            successResponse('Load inquiries retrieved', {
                loadId: loadId.toUpperCase(),
                driverCount: inquiries.length,
                inquiries,
            })
        );
    }

    /**
     * Get all loads a specific driver texted about
     *
     * GET /api/v1/load-inquiries/driver/:phone
     */
    async getByPhone(
        request: FastifyRequest<{ Params: { phone: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        const { phone } = request.params;
        const inquiries = await loadInquiryService.getByPhone(phone);

        return reply.send(
            successResponse('Driver load inquiries retrieved', {
                phoneNumber: phone,
                loadCount: inquiries.length,
                inquiries,
            })
        );
    }

    /**
     * Get load inquiry stats: loads ranked by driver interest count
     *
     * GET /api/v1/load-inquiries/stats?page=1&limit=10
     */
    async getStats(
        request: FastifyRequest<{
            Querystring: { page?: number; limit?: number };
        }>,
        reply: FastifyReply
    ): Promise<void> {
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 10;

        const { items, totalItems } = await loadInquiryService.getStats(page, limit);

        return reply.send(
            paginatedResponse('Load inquiry stats retrieved', items, page, limit, totalItems)
        );
    }
}

export const loadInquiryController = new LoadInquiryController();
