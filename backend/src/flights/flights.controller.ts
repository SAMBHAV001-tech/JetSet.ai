import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FlightsService } from './flights.service';

@Controller('flights')
export class FlightsController {
    constructor(private readonly flightsService: FlightsService) { }

    @Get('search')
    async search(@Query() params: any) {
        if (!params.originLocationCode || !params.destinationLocationCode || !params.departureDate) {
            throw new HttpException('Missing required search parameters: originLocationCode, destinationLocationCode, departureDate', HttpStatus.BAD_REQUEST);
        }
        return this.flightsService.searchFlights(params);
    }

    @Get('booking-options')
    async bookingOptions(
        @Query('booking_token') bookingToken: string,
        @Query('dep') dep: string,
        @Query('arr') arr: string,
        @Query('date') date: string,
        @Query('currency') currency: string,
    ) {
        if (!bookingToken) {
            throw new HttpException('booking_token query parameter is required', HttpStatus.BAD_REQUEST);
        }
        return this.flightsService.getFlightBookingOptions(bookingToken, dep, arr, date, currency || 'USD');
    }

    @Get('status')
    async status(@Query('flightIata') flightIata: string) {
        if (!flightIata) {
            throw new HttpException('flightIata query parameter is required', HttpStatus.BAD_REQUEST);
        }
        return this.flightsService.getFlightStatus(flightIata);
    }
}
