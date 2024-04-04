import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from '../lib/prisma'

export async function getEventAttendees(app:FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get('/events/:eventId/attendees', {
      schema: {
        summary: 'Get event attendees',
        tags: ['events'],
        params: z.object({
          eventId: z.string().uuid()
        }),
        querystring: z.object({
          query: z.string().nullish(),
          pageIndex: z.string().nullish().default('0').transform(Number)
        }),
        response: {
          200: z.object({
            attendees: z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                email: z.string().email(),
                createdAt: z.date(),
                checkedInAt: z.date().nullable()
              })
            )
          })
        }
      }
    }, async (request, reply) => {
      const { eventId } = request.params
      const { query, pageIndex } = request.query

      const attendees = await prisma.attendee.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          checkIn: {
            select: {
              createdAt: true
            }
          }
        },
        //se eu tiver uma busca o meu where vai ser um, se nao vai ser apenas pelo eventId
        where: query ? {
          eventId,
          name: {
            contains: query
          }
        } : {
          eventId
        },
        //vai pegar apenas 10 registros
        take: 10,
        //quantos registros ele vai pular
        skip: pageIndex * 10,
        //ordenar umas lista
        orderBy: {
          createdAt: 'desc'
        }
      })

      return reply.send({
        //map: percorrer um array e retornar um array modificado
        attendees: attendees.map(attendee => {
          return {
            id: attendee.id,
            name: attendee.name,
            email: attendee.email,
            createdAt: attendee.createdAt,
            checkedInAt: attendee.checkIn?.createdAt ?? null
          }
        })
      })
    })
}