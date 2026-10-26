import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../models/customer.dart';
import 'base_service.dart';
import 'dio_client.dart';

class CustomerService {
  static Future<Customer> getMe() async {
    try {
      final response = await DioClient.instance.dio.get('/customer/me');
      return Customer.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao buscar perfil do cliente');
    }
  }

  static Future<Customer> uploadPhoto(
    int customerId,
    Uint8List bytes, {
    String extension = 'jpg',
    String contentType = 'image/jpeg',
  }) async {
    try {
      final response = await DioClient.instance.dio.post(
        '/customer/$customerId/photo',
        data: {
          'imageBase64': base64Encode(bytes),
          'extension': extension,
          'contentType': contentType,
        },
      );
      final body = response.data as Map<String, dynamic>;
      return Customer.fromJson(body['customer'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(
        e,
        'Falha ao atualizar a foto do perfil',
      );
    }
  }
}
