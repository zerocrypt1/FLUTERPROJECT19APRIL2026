// lib/pricingPage.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PricingPage extends StatefulWidget {
  const PricingPage({super.key});

  @override
  State<PricingPage> createState() => _PricingPageState();
}

class _PricingPageState extends State<PricingPage> {
  bool _isLoading = false;

  final List<Map<String, dynamic>> plans = [
    {
      'id': 'free_plan',
      'name': 'Free',
      'price': '₹0',
      'duration': 'Lifetime',
      'features': ['View 5 Applicants', 'Basic Search'],
      'isPopular': false,
      'color': Colors.grey,
    },
    {
      'id': 'pro_plan',
      'name': 'Monthly Pro',
      'price': '₹499',
      'duration': '/month',
      'features': ['Unlimited Applicants', 'Advanced Filters', 'Verified Badge'],
      'isPopular': true,
      'color': Colors.indigo,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription Plans')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: plans.map((plan) => Card(
          child: ListTile(
            title: Text(plan['name']),
            subtitle: Text(plan['price']),
            trailing: ElevatedButton(
              onPressed: () {}, 
              child: const Text('Choose'),
            ),
          ),
        )).toList(),
      ),
    );
  }
}